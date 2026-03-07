// STEP 5.5.4 — CONFIDENCE INCENTIVE
// lib/scanner/confidenceIncentive.ts

/**
 * STEP 5.5.4 — Calculate Confidence Cap Based on Image Count
 * 
 * Returns the maximum confidence achievable with current image count.
 * Used for live feedback before scan runs.
 */
export function calculateConfidenceCap(imageCount: number, samePlantLikely: boolean = false): number {
  if (imageCount === 1) {
    return 82;
  } else if (imageCount === 2) {
    return 90;
  } else if (imageCount >= 3) {
    // If same plant likely, cap is lower
    if (samePlantLikely) {
      return 92;
    }
    return 99; // 3+ diverse images can reach 99%
  }
  return 82; // Fallback
}

/**
 * STEP 5.5.4 — Get Confidence Incentive Message
 * 
 * Returns a friendly message encouraging users to add more images.
 */
export function getConfidenceIncentiveMessage(
  currentImageCount: number,
  maxImages: number = 5
): string | null {
  if (currentImageCount >= maxImages) {
    return null; // Already at max
  }
  
  if (currentImageCount === 0) {
    return "More angles = higher certainty";
  }
  
  const currentCap = calculateConfidenceCap(currentImageCount);
  const nextCap = calculateConfidenceCap(currentImageCount + 1);
  
  if (nextCap > currentCap) {
    return `More angles = higher certainty (up to ${nextCap}% with ${currentImageCount + 1} images)`;
  }
  
  return "More angles = higher certainty";
}
