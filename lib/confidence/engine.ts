/**
 * Strain Confidence Engine
 * 
 * Bridges Scanner results and Strain Explorer.
 * Quantifies confidence, uncertainty, and alternatives.
 * 
 * PRINCIPLES:
 * - No definitive strain claims
 * - Confidence is EXPLAINED, not asserted
 * - Uncertainty is visible
 * - Alternatives are first-class citizens
 */

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ConfidenceSignals {
  visualSimilarity?: number; // 0-1
  phenotypeAlignment?: number; // 0-1
  scanConsistency?: number; // 0-1 (how often this strain appears)
  imageQuality?: number; // 0-1
  misidentificationRisk?: number; // 0-1 (higher = more risky/confusable)
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  internalScore: number; // 0-1, for internal use only
  explanation: string;
  reasoning: string[];
  limitations?: string[];
}

export interface AlternativeMatch {
  name: string;
  slug: string;
  confidenceLevel: ConfidenceLevel;
  reason: string;
  internalScore: number;
}

export interface ConfidenceOutput {
  primary: {
    name: string;
    slug: string;
    confidence: ConfidenceResult;
  };
  alternatives: AlternativeMatch[];
  noConfidentMatch: boolean;
}

// Configurable thresholds (0-1 scale)
const LOW_THRESHOLD = 0.4; // Below this = LOW
const HIGH_THRESHOLD = 0.7; // Above this = HIGH
// Between = MEDIUM

// Image quality caps
const LOW_QUALITY_THRESHOLD = 0.5; // Below this caps at MEDIUM
const VERY_POOR_QUALITY_THRESHOLD = 0.3; // Below this forces LOW

/**
 * Calculate internal confidence score from signals
 */
function calculateInternalScore(signals: ConfidenceSignals): number {
  const weights = {
    visualSimilarity: 0.30,
    phenotypeAlignment: 0.25,
    scanConsistency: 0.20,
    imageQuality: 0.15,
    misidentificationRisk: -0.10, // Negative - reduces confidence
  };

  let score = 0;
  let totalWeight = 0;

  // Visual similarity
  if (signals.visualSimilarity !== undefined) {
    score += signals.visualSimilarity * weights.visualSimilarity;
    totalWeight += weights.visualSimilarity;
  }

  // Phenotype alignment
  if (signals.phenotypeAlignment !== undefined) {
    score += signals.phenotypeAlignment * weights.phenotypeAlignment;
    totalWeight += weights.phenotypeAlignment;
  }

  // Scan consistency
  if (signals.scanConsistency !== undefined) {
    score += signals.scanConsistency * weights.scanConsistency;
    totalWeight += weights.scanConsistency;
  }

  // Image quality (affects cap, not base score)
  const imageQuality = signals.imageQuality ?? 1.0;
  
  // Misidentification risk (penalizes)
  if (signals.misidentificationRisk !== undefined) {
    score += (1 - signals.misidentificationRisk) * Math.abs(weights.misidentificationRisk);
    totalWeight += Math.abs(weights.misidentificationRisk);
  }

  // Normalize
  if (totalWeight > 0) {
    score = score / totalWeight;
  }

  // Apply image quality cap
  if (imageQuality < VERY_POOR_QUALITY_THRESHOLD) {
    score = Math.min(score, LOW_THRESHOLD - 0.1); // Force LOW
  } else if (imageQuality < LOW_QUALITY_THRESHOLD) {
    score = Math.min(score, HIGH_THRESHOLD - 0.1); // Cap at MEDIUM
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Determine confidence level from internal score
 */
function determineLevel(score: number): ConfidenceLevel {
  if (score < LOW_THRESHOLD) {
    return 'LOW';
  } else if (score >= HIGH_THRESHOLD) {
    return 'HIGH';
  } else {
    return 'MEDIUM';
  }
}

/**
 * Generate explanation for confidence level
 */
function generateExplanation(level: ConfidenceLevel, signals: ConfidenceSignals): string {
  switch (level) {
    case 'HIGH':
      return 'High confidence — visual traits and phenotype align consistently across scans.';
    case 'MEDIUM':
      return 'Medium confidence — strong phenotype alignment with some ambiguity.';
    case 'LOW':
      if (signals.imageQuality && signals.imageQuality < LOW_QUALITY_THRESHOLD) {
        return 'Low confidence — image quality limits match certainty.';
      }
      return 'Low confidence — visual traits overlap many strains or insufficient data.';
  }
}

/**
 * Generate reasoning bullets
 */
function generateReasoning(level: ConfidenceLevel, signals: ConfidenceSignals): string[] {
  const bullets: string[] = [];

  if (signals.visualSimilarity !== undefined) {
    if (signals.visualSimilarity >= 0.7) {
      bullets.push('Strong visual alignment');
    } else if (signals.visualSimilarity >= 0.4) {
      bullets.push('Moderate visual alignment');
    } else {
      bullets.push('Weak visual alignment');
    }
  }

  if (signals.phenotypeAlignment !== undefined) {
    if (signals.phenotypeAlignment >= 0.7) {
      bullets.push('Phenotype matches known ranges');
    } else if (signals.phenotypeAlignment >= 0.4) {
      bullets.push('Partial phenotype overlap');
    }
  }

  if (signals.scanConsistency !== undefined && signals.scanConsistency >= 0.6) {
    bullets.push('Consistent match across scan history');
  }

  if (signals.imageQuality !== undefined && signals.imageQuality < LOW_QUALITY_THRESHOLD) {
    bullets.push('Image quality limits confidence');
  }

  if (signals.misidentificationRisk !== undefined && signals.misidentificationRisk > 0.5) {
    bullets.push('Known confusable strain (similar phenotypes exist)');
  }

  return bullets.length > 0 ? bullets : ['Limited signal strength'];
}

/**
 * Generate limitations
 */
function generateLimitations(level: ConfidenceLevel, signals: ConfidenceSignals): string[] | undefined {
  const limitations: string[] = [];

  if (level === 'LOW') {
    limitations.push('Multiple strains share similar visual characteristics');
  }

  if (signals.imageQuality !== undefined && signals.imageQuality < LOW_QUALITY_THRESHOLD) {
    limitations.push('Image quality affects match certainty');
  }

  if (signals.misidentificationRisk !== undefined && signals.misidentificationRisk > 0.5) {
    limitations.push('This strain is commonly confused with similar varieties');
  }

  return limitations.length > 0 ? limitations : undefined;
}

/**
 * Main confidence engine function
 */
export function calculateConfidence(
  signals: ConfidenceSignals
): ConfidenceResult {
  const internalScore = calculateInternalScore(signals);
  const level = determineLevel(internalScore);
  
  return {
    level,
    internalScore,
    explanation: generateExplanation(level, signals),
    reasoning: generateReasoning(level, signals),
    limitations: generateLimitations(level, signals),
  };
}

/**
 * Convert alternative matches to confidence format
 */
export function formatAlternatives(
  alternatives: Array<{ name: string; slug: string; score: number }>,
  signals?: ConfidenceSignals
): AlternativeMatch[] {
  return alternatives.slice(0, 5).map(alt => {
    // Use score as internal score (assuming 0-1 range)
    const altScore = Math.max(0, Math.min(1, alt.score));
    const level = determineLevel(altScore);
    
    let reason = 'Similar visual or phenotypic characteristics';
    if (signals?.phenotypeAlignment && signals.phenotypeAlignment > 0.5) {
      reason = 'Phenotype overlap';
    } else if (signals?.visualSimilarity && signals.visualSimilarity > 0.5) {
      reason = 'Visual similarity';
    }

    return {
      name: alt.name,
      slug: alt.slug,
      confidenceLevel: level,
      reason,
      internalScore: altScore,
    };
  });
}

/**
 * Check if any match meets minimum confidence threshold
 */
export function hasConfidentMatch(internalScore: number): boolean {
  return internalScore >= LOW_THRESHOLD;
}

/**
 * Get static copy explaining confidence levels
 */
export function getConfidenceExplanationCopy(): {
  title: string;
  levels: Array<{ level: ConfidenceLevel; description: string }>;
  disclaimers: string[];
} {
  return {
    title: 'What Confidence Means',
    levels: [
      {
        level: 'HIGH',
        description: 'Visual traits and phenotype align consistently across scans. This match appears reliably.',
      },
      {
        level: 'MEDIUM',
        description: 'Strong phenotype alignment with some ambiguity. Good match but alternatives exist.',
      },
      {
        level: 'LOW',
        description: 'Visual traits overlap many strains or insufficient data. Multiple possibilities exist.',
      },
    ],
    disclaimers: [
      'Confidence does NOT guarantee strain identity.',
      'Confidence does NOT imply medical effects.',
      'Confidence reflects match quality, not strain quality.',
      'Low confidence is as trustworthy as high confidence — it means uncertainty is visible.',
    ],
  };
}

