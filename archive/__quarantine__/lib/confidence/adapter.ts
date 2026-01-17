/**
 * Adapter: Convert scanner API responses to Confidence Engine format
 */

import {
  ConfidenceSignals,
  calculateConfidence,
  formatAlternatives,
  hasConfidentMatch,
  AlternativeMatch,
  ConfidenceResult,
} from './engine';

export interface ScannerMatch {
  name?: string;
  slug?: string;
  strain?: string; // v3 API uses 'strain' instead of 'slug'
  score: number; // 0-1 or 0-100
  breakdown?: {
    pHash?: number;
    color?: number;
    texture?: number;
    embedding?: number;
    labelText?: number;
  };
}

export interface ScannerResponse {
  match?: ScannerMatch;
  alternatives?: ScannerMatch[];
  imageQuality?: number; // 0-1
}

/**
 * Convert scanner API response to confidence signals
 */
function scannerResponseToSignals(
  match: ScannerMatch,
  imageQuality?: number
): ConfidenceSignals {
  const breakdown = match.breakdown || {};
  
  // Normalize score to 0-1 if needed
  const normalizedScore = match.score > 1 ? match.score / 100 : match.score;
  
  // Visual similarity from breakdown components
  const visualComponents = [
    breakdown.pHash,
    breakdown.color,
    breakdown.texture,
    breakdown.embedding,
  ].filter(v => v !== undefined) as number[];
  
  const visualSimilarity = visualComponents.length > 0
    ? visualComponents.reduce((sum, val) => sum + (val > 1 ? val / 100 : val), 0) / visualComponents.length
    : normalizedScore;

  // Phenotype alignment (approximate from visual similarity for now)
  // In a full implementation, this would come from phenotype matching
  const phenotypeAlignment = normalizedScore * 0.9; // Rough approximation

  // Scan consistency (would need scan history - placeholder for now)
  const scanConsistency = 0.5; // Default neutral

  // Image quality (from API or default)
  const quality = imageQuality ?? 0.8; // Assume reasonable quality if not provided

  // Misidentification risk (placeholder - would need historical data)
  const misidentificationRisk = normalizedScore < 0.6 ? 0.4 : 0.2;

  return {
    visualSimilarity,
    phenotypeAlignment,
    scanConsistency,
    imageQuality: quality,
    misidentificationRisk,
  };
}

/**
 * Convert scanner API response to confidence output
 */
export function adaptScannerResponse(
  response: ScannerResponse
): {
  primary?: {
    name: string;
    slug: string;
    confidence: ConfidenceResult;
  };
  alternatives: AlternativeMatch[];
  noConfidentMatch: boolean;
} {
  if (!response.match) {
    return {
      alternatives: [],
      noConfidentMatch: true,
    };
  }

  // Handle v3 API format (uses 'strain' instead of 'slug')
  const matchSlug = response.match.slug || response.match.strain || '';
  const matchName = response.match.name || matchSlug;

  const signals = scannerResponseToSignals(response.match, response.imageQuality);
  const confidence = calculateConfidence(signals);

  // Check if confident match exists
  const noConfidentMatch = !hasConfidentMatch(confidence.internalScore);

  // Format alternatives
  const alternatives = response.alternatives
    ? formatAlternatives(
        response.alternatives.map(alt => {
          const altSlug = alt.slug || alt.strain || '';
          return {
            name: alt.name || altSlug,
            slug: altSlug,
            score: alt.score > 1 ? alt.score / 100 : alt.score,
          };
        }),
        signals
      )
    : [];

  return {
    primary: {
      name: matchName,
      slug: matchSlug,
      confidence,
    },
    alternatives,
    noConfidentMatch,
  };
}

