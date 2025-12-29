/**
 * Reasoning Code to Human-Readable Text Mapping
 * 
 * Maps internal reason codes to friendly, non-technical explanations
 */

export type ReasonCode =
  | 'strong_ocr_match'
  | 'moderate_ocr_match'
  | 'weak_ocr_match'
  | 'strong_visual_match'
  | 'moderate_visual_match'
  | 'weak_visual_match'
  | 'high_popularity'
  | 'moderate_popularity'
  | 'popularity_boost_applied'
  | 'obscure_strain_dampened';

/**
 * Map reason code to human-readable text
 */
export function getReasonText(code: ReasonCode): string {
  const mapping: Record<ReasonCode, string> = {
    strong_ocr_match: 'Strong label text match',
    moderate_ocr_match: 'Label text match',
    weak_ocr_match: 'Partial label text match',
    strong_visual_match: 'Strong visual similarity',
    moderate_visual_match: 'Visual similarity detected',
    weak_visual_match: 'Some visual similarity',
    high_popularity: 'Common strain',
    moderate_popularity: 'Well-known strain',
    popularity_boost_applied: 'Common strain',
    obscure_strain_dampened: 'Less common strain',
  };

  return mapping[code] || code;
}

/**
 * Format reasons array into human-readable summary
 */
export function formatReasons(reasons: string[]): string[] {
  if (!reasons || reasons.length === 0) {
    return [];
  }

  // Deduplicate and map to friendly text
  const uniqueReasons = Array.from(new Set(reasons));
  return uniqueReasons
    .map((code) => getReasonText(code as ReasonCode))
    .filter(Boolean);
}

/**
 * Get primary reason (most important signal)
 */
export function getPrimaryReason(reasons: string[]): string | null {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  // Priority order: OCR > Visual > Popularity
  const priority = [
    'strong_ocr_match',
    'moderate_ocr_match',
    'strong_visual_match',
    'moderate_visual_match',
    'weak_ocr_match',
    'weak_visual_match',
    'popularity_boost_applied',
  ];

  for (const code of priority) {
    if (reasons.includes(code)) {
      return getReasonText(code as ReasonCode);
    }
  }

  // Fallback to first reason
  return getReasonText(reasons[0] as ReasonCode);
}
