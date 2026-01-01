/**
 * AI Report Generator
 * Generates structured reports from scan data without modifying legacy UI
 */

import OpenAI from 'openai';
import { findPhenotypeSimilarStrains, VisualFeatures } from './strainPhenotypeIndex';

const SYSTEM_PROMPT = `You are a cannabis visual analysis assistant providing objective, evidence-based observations.

CRITICAL RULES (STRICTLY ENFORCED):
- You may NOT claim strain identity or make definitive identifications
- You may NOT invent lab values, THC/CBD percentages, or test results
- You must express uncertainty clearly when observations are limited
- You must stay within observed visual features only
- You must not mention internal system names, APIs, or technical terms
- You must not make medical claims or health recommendations
- You must not provide legal advice

YOUR ROLE:
- Describe visual appearance objectively
- Note observable characteristics (color, structure, texture)
- Provide context about common phenotypes
- Suggest related strain families (not specific identifications)
- Comment on handling and cure quality when observable

TONE:
- Professional and objective
- Cautious about certainty
- Educational but not prescriptive
- Respectful of limitations`;

interface ScanData {
  enrichment?: {
    image_quality?: {
      overall: string;
      blur: string;
      exposure: string;
      resolution: string;
    };
    visual_features?: {
      bud_density?: string;
      bud_shape?: string;
      trichome_coverage?: string;
      secondary_pigmentation?: string;
    };
  };
  vision?: {
    text: string[];
    labels: string[];
    colors: {
      primary: string;
      secondary: string;
    };
  };
}

interface MatchResult {
  match?: {
    name: string;
    confidence: number;
    reasoning: string;
  } | null;
  alternatives?: Array<{
    name: string;
    confidence: number;
    reasoning: string;
  }>;
}

interface StrainCandidate {
  name: string;
  slug: string;
  confidence: number;
}

export interface ScanReport {
  summary: {
    overall_assessment: string;
    confidence_level: 'low' | 'moderate' | 'high';
  };
  visual_analysis: {
    appearance: string;
    trichome_observations: string;
    coloration: string;
    structure: string;
  };
  phenotype_context: {
    similar_profiles: string;
    common_traits: string;
    notable_deviations: string;
  };
  strain_cross_reference: {
    related_families: string[];
    explanation: string;
  };
  handling_and_cure_notes: {
    observations: string;
    confidence: string;
  };
  disclaimer: string;
}

/**
 * Generate AI report from scan data
 */
export async function generateScanReport(
  scan: ScanData,
  enrichment: any,
  matchResult: MatchResult | null,
  strainCandidates: StrainCandidate[] = []
): Promise<{ report: ScanReport; confidenceScore: number }> {
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[reportGenerator] OpenAI API key not configured, returning fallback report');
    return generateFallbackReport(scan, matchResult);
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // PHASE 2: Find phenotype-similar strains (descriptive, not identification)
    const visualFeatures = enrichment?.visual_features as VisualFeatures | undefined;
    const phenotypeContext = await findPhenotypeSimilarStrains(visualFeatures, 10);

    // Build structured input data
    const imageQuality = enrichment?.image_quality || {};
    const vision = scan.vision || { text: [], labels: [], colors: { primary: '#4a5568', secondary: '#718096' } };
    
    // Extract match info (if available)
    const matchName = matchResult?.match?.name || null;
    const matchConfidence = matchResult?.match?.confidence || 0;
    const alternatives = matchResult?.alternatives || [];
    
    // Build candidate list
    const candidates = strainCandidates.length > 0 
      ? strainCandidates.map(c => `${c.name} (${Math.round(c.confidence * 100)}%)`).join(', ')
      : alternatives.slice(0, 3).map(a => `${a.name} (${Math.round(a.confidence * 100)}%)`).join(', ');

    // Build phenotype context text (emphasize visual similarity, not identification)
    const phenotypeContextText = phenotypeContext.families.length > 0
      ? `PHENOTYPE SIMILARITY CONTEXT (VISUAL SIMILARITY ONLY, NOT IDENTIFICATIONS):
- Visual features share similarities with strains in these families: ${phenotypeContext.families.join(', ')}
- Common visual traits observed: ${phenotypeContext.common_traits.join(', ')}
- Example strains with similar visual profiles (for reference only): ${phenotypeContext.example_strains.slice(0, 3).join(', ')}
IMPORTANT: These are visual similarities only. This is NOT a strain identification.`
      : '';

    // Construct user prompt with structured data
    const userPrompt = `Generate a visual analysis report based on these observations:

VISUAL FEATURES:
- Bud density: ${visualFeatures?.bud_density || 'unknown'}
- Bud shape: ${visualFeatures?.bud_shape || 'unknown'}
- Trichome coverage: ${visualFeatures?.trichome_coverage || 'unknown'}
- Secondary pigmentation: ${visualFeatures?.secondary_pigmentation || 'unknown'}

IMAGE QUALITY:
- Overall: ${imageQuality.overall || 'unknown'}
- Blur: ${imageQuality.blur || 'unknown'}
- Exposure: ${imageQuality.exposure || 'unknown'}
- Resolution: ${imageQuality.resolution || 'unknown'}

VISION ANALYSIS:
- Detected text: ${vision.text.length > 0 ? vision.text.slice(0, 5).join(', ') : 'none'}
- Labels: ${vision.labels.length > 0 ? vision.labels.slice(0, 10).join(', ') : 'none'}
- Dominant colors: ${vision.colors.primary}, ${vision.colors.secondary}

${matchName ? `POTENTIAL MATCH CONTEXT (NOT DEFINITIVE): ${matchName} (${Math.round(matchConfidence * 100)}% confidence). This is a visual similarity match, not a confirmed identification.` : ''}

${candidates ? `RELATED CANDIDATES: ${candidates}` : ''}

${phenotypeContextText}

Generate a report following the exact JSON structure:
{
  "summary": {
    "overall_assessment": "Brief 2-3 sentence assessment",
    "confidence_level": "low" | "moderate" | "high"
  },
  "visual_analysis": {
    "appearance": "General appearance description",
    "trichome_observations": "Observations about trichome coverage and quality",
    "coloration": "Color analysis including primary and secondary colors",
    "structure": "Structural observations about bud shape and density"
  },
  "phenotype_context": {
    "similar_profiles": "Description of similar visual phenotypes based on observed features. Emphasize these are visual similarities, not identifications.",
    "common_traits": "Common visual traits observed. Focus on descriptive characteristics only.",
    "notable_deviations": "Any notable deviations from typical profiles observed"
  },
  "strain_cross_reference": {
    "related_families": ["array", "of", "related", "strain", "families"],
    "explanation": "Explanation of visual similarity to these families. MUST emphasize this is visual similarity only, NOT a strain identification. Use phrases like 'visually similar to', 'shares visual traits with', 'phenotypically resembles' - never claim identity."
  },
  "handling_and_cure_notes": {
    "observations": "Observations about handling and cure quality",
    "confidence": "low" | "moderate" | "high"
  },
  "disclaimer": "Standard disclaimer about visual analysis limitations"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const reportJson = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Validate and structure report
    const report: ScanReport = {
      summary: {
        overall_assessment: reportJson.summary?.overall_assessment || 'Visual analysis completed with limited observations.',
        confidence_level: ['low', 'moderate', 'high'].includes(reportJson.summary?.confidence_level) 
          ? reportJson.summary.confidence_level 
          : 'low',
      },
      visual_analysis: {
        appearance: reportJson.visual_analysis?.appearance || 'Appearance analysis based on available visual data.',
        trichome_observations: reportJson.visual_analysis?.trichome_observations || 'Trichome coverage analysis.',
        coloration: reportJson.visual_analysis?.coloration || 'Color analysis based on observed hues.',
        structure: reportJson.visual_analysis?.structure || 'Structural observations.',
      },
      phenotype_context: {
        similar_profiles: reportJson.phenotype_context?.similar_profiles || 
          (phenotypeContext.families.length > 0 
            ? `Visual features show similarity to ${phenotypeContext.families.join(', ')} family phenotypes. This is descriptive context only, not an identification.`
            : 'Similar visual profiles noted.'),
        common_traits: reportJson.phenotype_context?.common_traits || 
          (phenotypeContext.common_traits.length > 0
            ? `Common visual traits: ${phenotypeContext.common_traits.join(', ')}.`
            : 'Common traits observed.'),
        notable_deviations: reportJson.phenotype_context?.notable_deviations || 'No notable deviations observed.',
      },
      strain_cross_reference: {
        related_families: Array.isArray(reportJson.strain_cross_reference?.related_families)
          ? reportJson.strain_cross_reference.related_families
          : (phenotypeContext.families.length > 0 ? phenotypeContext.families : []),
        explanation: reportJson.strain_cross_reference?.explanation || 
          (phenotypeContext.families.length > 0
            ? `Visual characteristics show similarity to ${phenotypeContext.families.join(', ')} family strains. This is visual similarity only, NOT a strain identification.`
            : 'Related strain families based on visual characteristics. Visual similarity only, not an identification.'),
      },
      handling_and_cure_notes: {
        observations: reportJson.handling_and_cure_notes?.observations || 'Handling and cure quality assessment.',
        confidence: ['low', 'moderate', 'high'].includes(reportJson.handling_and_cure_notes?.confidence)
          ? reportJson.handling_and_cure_notes.confidence
          : 'low',
      },
      disclaimer: reportJson.disclaimer || 'This is a visual analysis only. Strain identification requires additional verification. No lab values or test results are provided.',
    };

    // Calculate confidence score (0-1)
    const confidenceScore = calculateConfidenceScore(report, matchConfidence, imageQuality);

    return { report, confidenceScore };
  } catch (error) {
    console.error('[reportGenerator] Error generating report:', error);
    // Return fallback report on error
    return generateFallbackReport(scan, matchResult);
  }
}

/**
 * Generate fallback report when AI is unavailable
 */
function generateFallbackReport(
  scan: ScanData,
  matchResult: MatchResult | null
): { report: ScanReport; confidenceScore: number } {
  const visualFeatures = scan.enrichment?.visual_features || {};
  const matchName = matchResult?.match?.name || null;

  const report: ScanReport = {
    summary: {
      overall_assessment: 'Visual analysis completed. ' + 
        (matchName ? `Visual similarity to ${matchName} noted, but this is not a confirmed identification.` : 'Limited observations available.'),
      confidence_level: 'low',
    },
    visual_analysis: {
      appearance: 'Visual appearance analysis based on available image data.',
      trichome_observations: visualFeatures.trichome_coverage 
        ? `Trichome coverage appears ${visualFeatures.trichome_coverage}.` 
        : 'Trichome coverage analysis not available.',
      coloration: 'Color analysis based on observed image data.',
      structure: visualFeatures.bud_shape 
        ? `Bud structure appears ${visualFeatures.bud_shape}.` 
        : 'Structural analysis based on available data.',
    },
    phenotype_context: {
      similar_profiles: 'Similar visual profiles may exist, but detailed comparison requires additional data.',
      common_traits: 'Common traits observed in similar visual profiles.',
      notable_deviations: 'No notable deviations observed with available data.',
    },
    strain_cross_reference: {
      related_families: matchName ? [matchName] : [],
      explanation: matchName 
        ? `Visual similarity to ${matchName} noted, but this is not a confirmed identification.`
        : 'Related strain families cannot be determined from available visual data.',
    },
    handling_and_cure_notes: {
      observations: 'Handling and cure quality assessment requires additional data.',
      confidence: 'low',
    },
    disclaimer: 'This is a visual analysis only. Strain identification requires additional verification. No lab values or test results are provided.',
  };

  return { report, confidenceScore: 0.3 };
}

/**
 * Calculate confidence score from report data
 */
function calculateConfidenceScore(
  report: ScanReport,
  matchConfidence: number,
  imageQuality: any
): number {
  let score = 0.3; // Base score

  // Boost based on match confidence
  if (matchConfidence > 0.7) score += 0.3;
  else if (matchConfidence > 0.4) score += 0.2;
  else if (matchConfidence > 0) score += 0.1;

  // Boost based on image quality
  if (imageQuality.overall === 'excellent') score += 0.2;
  else if (imageQuality.overall === 'good') score += 0.1;

  // Boost based on report confidence level
  if (report.summary.confidence_level === 'high') score += 0.1;
  else if (report.summary.confidence_level === 'moderate') score += 0.05;

  return Math.min(1.0, Math.max(0.0, score));
}

