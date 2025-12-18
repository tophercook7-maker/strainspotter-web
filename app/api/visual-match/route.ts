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
import fs from 'fs';
import path from 'path';
import { VAULT_RAW_ROOT } from '@/lib/vault/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scan_id } = body;

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

    // Find best match
    const sorted = scoredCandidates.sort((a, b) => b.score - a.score);
    const bestMatch = sorted[0] && sorted[0].score >= 40 ? sorted[0] : null;

    let matchResult: {
      match: {
        name: string;
        slug: string;
        confidence: number;
        reasoning: string;
        public_image?: string | null;
      } | null;
      alternatives: Array<{
        name: string;
        slug: string;
        confidence: number;
        reasoning: string;
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
        const reasoning = ocrConfidence && ocrConfidence > 50
          ? `OCR text match with ${ocrConfidence}% OCR confidence (${bestMatch.score}% match score)`
          : `OCR text match (${bestMatch.score}% confidence)`;
        matchResult.match = {
          name: matchedStrain.name,
          slug: bestMatch.slug,
          confidence: bestMatch.score,
          reasoning,
          public_image: publicImagePath,
        };
      }
    }

    // Get alternatives (top 5 by score) - reuse scoredCandidates
    const topAlternatives = sorted
      .filter((a) => a.slug !== bestMatch?.slug && a.score >= 20)
      .slice(0, 5)
      .map((alt) => {
        const strain = strains.find((s) => s.slug === alt.slug);
        return {
          slug: alt.slug,
          score: alt.score,
          name: strain?.name || alt.slug,
          publicImage: readPublicImage(alt.slug),
        };
      });

    matchResult.alternatives = topAlternatives.map((alt) => {
      return {
        name: alt.name,
        slug: alt.slug,
        confidence: alt.score,
        reasoning: `OCR text match (${alt.score}% confidence)`,
        public_image: alt.publicImage,
      };
    });

    // If no match found, return "Strain Unknown"
    if (!matchResult.match) {
      console.log('[visual-match] No match found above threshold');
    } else {
      console.log(`[visual-match] Match result: ${matchResult.match.name} (${matchResult.match.confidence}%)`);
    }

    // Update scan with match result
    await updateScan(scan_id, {
      status: 'matched',
      match: matchResult,
    });

    return NextResponse.json({
      scan_id,
      match: matchResult.match,
      alternatives: matchResult.alternatives,
    });
  } catch (error: any) {
    console.error('[visual-match] Visual match error:', error);
    return NextResponse.json(
      { error: error.message || 'Visual matching failed' },
      { status: 500 }
    );
  }
}
