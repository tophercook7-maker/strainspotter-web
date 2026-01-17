/**
 * Confidence Level Constants and Utilities
 * 
 * Maps combined_score to human-readable confidence levels
 */

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 50,
  LOW: 30,
} as const;

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'High';
  } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Get confidence color class
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'High':
      return 'bg-green-500';
    case 'Medium':
      return 'bg-yellow-500';
    case 'Low':
      return 'bg-orange-500';
  }
}
