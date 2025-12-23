/**
 * POST /api/visual-match
 * Match an image against the strain library using OCR and Vault data
 * Free, local matching - no paid AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScan, updateScan } from '@/app/api/_utils/supabaseAdmin';
import { VisionResults } from '@/app/api/_utils/vision';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { readOCRFromManifest, readPublicImage } from '@/lib/vault/datasetRead';
import { scoreMatch, findBestMatch } from '@/lib/matcher/simpleMatcher';
import { enrichIDScanResult } from '@/lib/scan/enrichment';
import { fingerprintImageBuffer } from '@/lib/visual/fingerprint';
import { matchScanToStrains } from '@/lib/visual/clusterMatch';
import { OCR_WEIGHT, VISUAL_WEIGHT, MIN_COMBINED_SCORE, getCalibrationConfig, LOW_OCR_THRESHOLD, MID_VISUAL_DISTANCE, POPULARITY_WEIGHT, MAX_POPULARITY_BOOST, POPULARITY_MULTIPLIER, OBSCURE_PENALTY, OBSCURE_STRAIN_THRESHOLD } from '@/lib/visual/calibration';
import { getPopularityPrior, isObscureStrain } from '@/lib/visual/popularity';
import fs from 'fs';
import path from 'path';
import { VAULT_RAW_ROOT } from '@/lib/vault/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scan_id } = body;
    
    // Check for debug mode
    const url = new URL(req.url);
    const debugMode = process.env.NODE_ENV !== 'production' || url.searchParams.get('debug') === 'true';

    if (!scan_id) {
      return NextResponse.json({ error: 'scan_id is required' }, { status: 400 });
    }

    console.log(`[visual-match] Matching scan: ${scan_id}`);

    // Load scan from database
    const scan = await getScan(scan_id);
    if (!scan) {
      console.error(`[visual-match] Scan not found: ${scan_id}`);
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Get vision results (support both new and legacy field names)
    const visionData = scan.vision || scan.vision_results;
    if (!visionData) {
      console.error(`[visual-match] Scan has not been processed yet: ${scan_id}`);
      return NextResponse.json(
        { error: 'Scan has not been processed yet. Call /api/scans/[scan_id]/process first.' },
        { status: 400 }
      );
    }

    const visionResults = visionData as VisionResults;
    const visionText = visionResults.text || [];

    // PART 1: Compute visual fingerprint for cluster matching
    let visualCandidates: Array<{
      strain_slug: string;
      visual_score: number;
      confidence: number;
      combined_score: number;
    }> = [];
    let visualDebug: {
      matched_clusters?: Array<{ cluster_id: string; distance: number }>;
      visual_distance?: number;
    } = {};
    
    try {
      if (scan.image_url) {
        // Download image for fingerprinting
        const imageResponse = await fetch(scan.image_url);
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const fingerprint = await fingerprintImageBuffer(imageBuffer);
          
          if (fingerprint) {
            // PART 2 & 3: Match to clusters and rank strains
            const matchResult = matchScanToStrains(fingerprint.phash, 5, 10);
            visualCandidates = matchResult.candidates;
            
            // Store debug info if available
            if (matchResult.debug) {
              visualDebug.matched_clusters = matchResult.debug.matched_clusters;
              // Get best distance from matched clusters
              if (matchResult.debug.matched_clusters.length > 0) {
                visualDebug.visual_distance = matchResult.debug.matched_clusters[0].distance;
              }
            }
            
            console.log(`[visual-match] Visual cluster matching: ${visualCandidates.length} candidates`);
          }
        }
      }
    } catch (error) {
      // Visual matching is optional, continue with OCR matching
      console.warn('[visual-match] Visual cluster matching failed:', error);
    }

    // Load all strains from database
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data: strains, error: strainsError } = await supabaseAdmin
      .from('strains')
      .select('id, name, slug, aliases')
      .limit(1000);

    if (strainsError || !strains || strains.length === 0) {
      console.error('[visual-match] Error loading strains:', strainsError);
      return NextResponse.json({ error: 'Failed to load strain library' }, { status: 500 });
    }

    console.log(`[visual-match] Loaded ${strains.length} strains, matching with ${visionText.length} text lines`);

    // Build candidates with OCR text from Vault
    const candidates: Array<{ slug: string; ocrText: string[] }> = [];
    
    for (const strain of strains) {
      const ocrText = readOCRFromManifest(strain.slug);
      if (ocrText.length > 0) {
        candidates.push({ slug: strain.slug, ocrText });
      }
    }

    // Get OCR confidence helper
    const getOCRConfidence = (slug: string): number | undefined => {
      const manifestPath = path.join(VAULT_RAW_ROOT, slug, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          return manifest?.ocr?.confidence;
        } catch {
          return undefined;
        }
      }
      return undefined;
    };

    // Score all candidates with OCR confidence boost
    const scoredCandidates = candidates.map((c) => {
      const ocrConfidence = getOCRConfidence(c.slug);
      const score = scoreMatch(visionText, c.ocrText, ocrConfidence);
      return { slug: c.slug, score };
    });

    // Combine OCR scores with visual cluster scores
    const visualScoreMap = new Map(
      visualCandidates.map(v => [v.strain_slug, v.visual_score])
    );
    const visualCombinedMap = new Map(
      visualCandidates.map(v => [v.strain_slug, v.combined_score])
    );
    
    // Get visual distance for context-aware dampening
    const bestVisualDistance = visualDebug.visual_distance || Infinity;
    
    // PART 2: Context-aware dampening check
    // Check if signals are weak (low OCR + high visual distance)
    // We'll check this per candidate since OCR scores vary
    
    // Boost OCR scores with visual scores (weighted combination using calibration constants)
    const combinedCandidates = scoredCandidates.map((c) => {
      const visualScore = visualScoreMap.get(c.slug) || 0;
      const visualCombined = visualCombinedMap.get(c.slug) || 0;
      
      // Base combined score
      let combinedScore = (c.score * OCR_WEIGHT) + (visualCombined * VISUAL_WEIGHT);
      
      // PART 2: Context-aware dampening for weak signals
      // Check if THIS candidate has weak signals
      const candidateWeakSignals = c.score < LOW_OCR_THRESHOLD && bestVisualDistance > MID_VISUAL_DISTANCE;
      
      // PART 3: Apply popularity boost
      const popularityPrior = getPopularityPrior(c.slug);
      let adjustedPopularityPrior = popularityPrior;
      
      if (candidateWeakSignals) {
        if (isObscureStrain(c.slug, OBSCURE_STRAIN_THRESHOLD)) {
          // Reduce obscure strain scores when signals are weak
          combinedScore *= OBSCURE_PENALTY;
        } else {
          // Boost popular strains when signals are weak
          adjustedPopularityPrior = Math.min(1.0, popularityPrior * POPULARITY_MULTIPLIER);
        }
      }
      
      // Apply popularity boost (capped)
      const finalPopularityBoost = Math.min(
        POPULARITY_WEIGHT * adjustedPopularityPrior * 100,
        MAX_POPULARITY_BOOST
      );
      combinedScore += finalPopularityBoost;
      
      // Build reasoning (for debug)
      const reasons: string[] = [];
      if (c.score >= 60) reasons.push('strong_ocr_match');
      else if (c.score >= 40) reasons.push('moderate_ocr_match');
      else if (c.score > 0) reasons.push('weak_ocr_match');
      
      if (visualScore >= 70) reasons.push('strong_visual_match');
      else if (visualScore >= 50) reasons.push('moderate_visual_match');
      else if (visualScore > 0) reasons.push('weak_visual_match');
      
      if (popularityPrior >= 0.9) reasons.push('high_popularity');
      else if (popularityPrior >= 0.7) reasons.push('moderate_popularity');
      
      if (finalPopularityBoost > 0) reasons.push('popularity_boost_applied');
      if (candidateWeakSignals && isObscureStrain(c.slug, OBSCURE_STRAIN_THRESHOLD)) {
        reasons.push('obscure_strain_dampened');
      }
      
      return {
        slug: c.slug,
        score: combinedScore,
        ocrScore: c.score,
        visualScore,
        visualCombined,
        popularityPrior,
        popularityBoost: finalPopularityBoost,
        reasons,
      };
    });

    // Find best match (use combined score with calibration threshold)
    const sorted = combinedCandidates.sort((a, b) => b.score - a.score);
    const bestMatch = sorted[0] && sorted[0].score >= MIN_COMBINED_SCORE ? sorted[0] : null;

    let matchResult: {
      match: {
        name: string;
        slug: string;
        confidence: number;
        reasoning: string;
        reasons?: string[]; // Internal reason codes for UI
        public_image?: string | null;
      } | null;
      alternatives: Array<{
        name: string;
        slug: string;
        confidence: number;
        reasoning: string;
        reasons?: string[]; // Internal reason codes for UI
        public_image?: string | null;
      }>;
    } = {
      match: null,
      alternatives: [],
    };

    if (bestMatch) {
      // Find strain name
      const matchedStrain = strains.find((s) => s.slug === bestMatch.slug);
      if (matchedStrain) {
        const publicImagePath = readPublicImage(bestMatch.slug);
        const ocrConfidence = getOCRConfidence(bestMatch.slug);
        const visualScore = bestMatch.visualScore || 0;
        const popularityPrior = bestMatch.popularityPrior || 0.5;
        
        // Build reasoning with OCR, visual, and popularity signals
        let reasoning = '';
        if (bestMatch.ocrScore >= 60 && visualScore >= 70) {
          reasoning = `Strong OCR match (${bestMatch.ocrScore}%) + visual similarity (${visualScore}%)`;
        } else if (bestMatch.ocrScore >= 40 && visualScore >= 50) {
          reasoning = `OCR match (${bestMatch.ocrScore}%) + visual similarity (${visualScore}%)`;
        } else if (bestMatch.ocrScore >= 40) {
          reasoning = ocrConfidence && ocrConfidence > 50
            ? `OCR text match with ${ocrConfidence}% OCR confidence (${bestMatch.ocrScore}% match score)`
            : `OCR text match (${bestMatch.ocrScore}% confidence)`;
        } else if (visualScore >= 50) {
          reasoning = `Visual similarity match (${visualScore}% confidence)`;
        } else {
          // Weak signals - mention popularity if it helped
          if (popularityPrior >= 0.9 && bestMatch.popularityBoost > 0) {
            reasoning = `Combined match (${Math.round(bestMatch.score)}% confidence, popular strain)`;
          } else {
            reasoning = `Combined match (${Math.round(bestMatch.score)}% confidence)`;
          }
        }
        
        matchResult.match = {
          name: matchedStrain.name,
          slug: bestMatch.slug,
          confidence: Math.round(bestMatch.score),
          reasoning,
          reasons: bestMatch.reasons || [], // Include reasons for UI (always, not just debug)
          public_image: publicImagePath,
        };
      }
    }

    // Get alternatives (top 5 by score) - use combined scores
    const topAlternatives = sorted
      .filter((a) => a.slug !== bestMatch?.slug && a.score >= MIN_COMBINED_SCORE - 10) // Slightly lower threshold for alternatives
      .slice(0, 5)
      .map((alt) => {
        const strain = strains.find((s) => s.slug === alt.slug);
        const visualScore = alt.visualScore || 0;
        const ocrScore = alt.ocrScore || 0;
        const popularityPrior = alt.popularityPrior || 0.5;
        
        let reasoning = '';
        if (ocrScore >= 30 && visualScore >= 40) {
          reasoning = `OCR (${ocrScore}%) + visual (${visualScore}%)`;
        } else if (ocrScore >= 30) {
          reasoning = `OCR text match (${ocrScore}% confidence)`;
        } else if (visualScore >= 40) {
          reasoning = `Visual similarity (${visualScore}% confidence)`;
        } else {
          // Weak signals - mention popularity if it helped
          if (popularityPrior >= 0.9 && alt.popularityBoost > 0) {
            reasoning = `Combined match (${Math.round(alt.score)}% confidence, popular strain)`;
          } else {
            reasoning = `Combined match (${Math.round(alt.score)}% confidence)`;
          }
        }
        
        return {
          name: strain?.name || alt.slug,
          slug: alt.slug,
          confidence: Math.round(alt.score),
          reasoning,
          reasons: alt.reasons || [], // Include reasons for UI
          public_image: readPublicImage(alt.slug),
        };
      });

    matchResult.alternatives = topAlternatives;

    // If no match found, return "Strain Unknown"
    if (!matchResult.match) {
      console.log('[visual-match] No match found above threshold');
    } else {
      console.log(`[visual-match] Match result: ${matchResult.match.name} (${matchResult.match.confidence}%)`);
    }

    // Enrich result with explanations and recommendations
    const enrichment = enrichIDScanResult(matchResult, visionResults);
    
    // Build debug object (dev-only)
    const debug = debugMode ? {
      ocr_score: bestMatch?.ocrScore || null,
      visual_score: bestMatch?.visualScore || null,
      combined_score: bestMatch?.score || null,
      visual_distance: visualDebug.visual_distance || null,
      matched_clusters: visualDebug.matched_clusters || [],
      visual_weight: VISUAL_WEIGHT,
      ocr_weight: OCR_WEIGHT,
      popularity_weight: POPULARITY_WEIGHT,
      best_match_reasons: bestMatch?.reasons || [],
      calibration: getCalibrationConfig(),
    } : undefined;
    
    // Update scan with match result and enrichment
    await updateScan(scan_id, {
      status: 'matched',
      match: {
        ...matchResult,
        enrichment,
      },
    });

    const response: any = {
      scan_id,
      match: matchResult.match,
      alternatives: matchResult.alternatives,
      enrichment,
    };
    
    // Only include debug in dev mode or with ?debug=true
    if (debug) {
      response.debug = debug;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[visual-match] Visual match error:', error);
    return NextResponse.json(
      { error: error.message || 'Visual matching failed' },
      { status: 500 }
    );
  }
}
