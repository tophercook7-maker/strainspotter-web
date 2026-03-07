// lib/scanner/imageLabels.ts
// Phase 4.0 Part A — User-Facing Image Labels

/**
 * Phase 4.0 Part A — User-Facing Image Label
 * Labels shown to user for each image
 */
export type UserImageLabel = "Top view" | "Side view" | "Close-up" | "Optional";

/**
 * Phase 4.0 Part A — Assign user-facing labels to images
 * 
 * Rules:
 * - Image 1: "Top view" (required)
 * - Image 2: "Side view" (optional but recommended)
 * - Image 3: "Close-up" (optional)
 * - Image 4+: "Optional"
 */
export function assignUserImageLabels(imageCount: number): Map<number, UserImageLabel> {
  const labels = new Map<number, UserImageLabel>();
  
  if (imageCount >= 1) {
    labels.set(0, "Top view");
  }
  if (imageCount >= 2) {
    labels.set(1, "Side view");
  }
  if (imageCount >= 3) {
    labels.set(2, "Close-up");
  }
  if (imageCount >= 4) {
    labels.set(3, "Optional");
  }
  if (imageCount >= 5) {
    labels.set(4, "Optional");
  }
  
  return labels;
}
