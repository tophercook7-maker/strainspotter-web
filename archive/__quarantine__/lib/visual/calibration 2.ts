/**
 * Visual Matching Calibration Constants
 * 
 * Centralized configuration for visual cluster matching.
 * Adjust these values to tune matching behavior.
 */

// Score combination weights
export const OCR_WEIGHT = 0.6; // Weight for OCR-based matching
export const VISUAL_WEIGHT = 0.4; // Weight for visual cluster matching

// Visual distance thresholds
export const MAX_VISUAL_DISTANCE = 12; // Maximum Hamming distance to consider (out of 64)
export const MIN_VISUAL_SCORE = 0; // Minimum visual score (0-100)

// Cluster confidence thresholds
export const MIN_CLUSTER_CONFIDENCE = 0.4; // Minimum strain confidence to fully trust visual match
export const LOW_CONFIDENCE_PENALTY = 0.5; // Reduce visual contribution by this factor if confidence is low

// Boost caps (prevent visual from overpowering OCR)
export const MAX_VISUAL_BOOST = 20; // Maximum points visual can add to combined score
export const VISUAL_SCORE_MULTIPLIER = 0.7; // Multiplier for visual score in combined calculation
export const CONFIDENCE_MULTIPLIER = 0.3; // Multiplier for confidence in combined calculation

// Matching thresholds
export const MIN_COMBINED_SCORE = 30; // Minimum combined score to return a match
export const MIN_OCR_SCORE = 20; // Minimum OCR score to consider
export const MIN_VISUAL_SCORE_THRESHOLD = 40; // Minimum visual score to consider

// Context-aware dampening thresholds
export const LOW_OCR_THRESHOLD = 50; // OCR confidence below this triggers context dampening
export const MID_VISUAL_DISTANCE = 8; // Visual distance above this triggers context dampening
export const OBSCURE_STRAIN_THRESHOLD = 0.4; // Popularity below this is considered obscure

// Popularity weighting
export const POPULARITY_WEIGHT = 0.1; // Weight for popularity boost (0-1)
export const MAX_POPULARITY_BOOST = 10; // Maximum points popularity can add
export const POPULARITY_MULTIPLIER = 1.2; // Multiplier for popular strains in weak signal context
export const OBSCURE_PENALTY = 0.8; // Multiplier for obscure strains in weak signal context

// Cluster matching
export const TOP_CLUSTERS_COUNT = 5; // Number of top clusters to consider
export const MAX_STRAIN_CANDIDATES = 10; // Maximum strain candidates to return

/**
 * Get calibration config (useful for debug output)
 */
export function getCalibrationConfig() {
  return {
    ocr_weight: OCR_WEIGHT,
    visual_weight: VISUAL_WEIGHT,
    max_visual_distance: MAX_VISUAL_DISTANCE,
    min_cluster_confidence: MIN_CLUSTER_CONFIDENCE,
    max_visual_boost: MAX_VISUAL_BOOST,
    visual_score_multiplier: VISUAL_SCORE_MULTIPLIER,
    confidence_multiplier: CONFIDENCE_MULTIPLIER,
    min_combined_score: MIN_COMBINED_SCORE,
    top_clusters_count: TOP_CLUSTERS_COUNT,
    max_strain_candidates: MAX_STRAIN_CANDIDATES,
    popularity_weight: POPULARITY_WEIGHT,
    max_popularity_boost: MAX_POPULARITY_BOOST,
    low_ocr_threshold: LOW_OCR_THRESHOLD,
    mid_visual_distance: MID_VISUAL_DISTANCE,
    obscure_strain_threshold: OBSCURE_STRAIN_THRESHOLD,
  };
}
