// lib/scanner/imageIntakeLabels.ts
// Phase 3.4 Part A — Image Intake Rules & Internal Labeling

/**
 * Phase 3.4 Part A — Internal Image Label
 * Labels images internally for analysis without exposing to user
 */
export type ImageLabel = "A" | "B" | "C";

/**
 * Phase 3.4 Part A — Image Role
 * What each image is best suited for analyzing
 */
export type ImageRole = 
  | "structure_bud_shape"  // Image A: structure / bud shape
  | "trichomes_surface"    // Image B: trichomes / surface
  | "color_pistils";        // Image C: color / pistils (optional)

/**
 * Phase 3.4 Part A — Assign internal labels to images
 * 
 * Rules:
 * - Image A: structure / bud shape (first image, typically full view)
 * - Image B: trichomes / surface (second image, typically close-up)
 * - Image C: color / pistils (third image, optional, macro/detail)
 * 
 * Do NOT expose labels to user
 */
export function assignImageLabels(imageCount: number): Map<number, { label: ImageLabel; role: ImageRole }> {
  const labels = new Map<number, { label: ImageLabel; role: ImageRole }>();
  
  if (imageCount >= 1) {
    labels.set(0, { label: "A", role: "structure_bud_shape" });
  }
  if (imageCount >= 2) {
    labels.set(1, { label: "B", role: "trichomes_surface" });
  }
  if (imageCount >= 3) {
    labels.set(2, { label: "C", role: "color_pistils" });
  }
  
  return labels;
}

/**
 * Phase 3.4 Part A — Get image label description (for internal use only)
 */
export function getImageLabelDescription(label: ImageLabel): string {
  switch (label) {
    case "A":
      return "structure/bud shape";
    case "B":
      return "trichomes/surface";
    case "C":
      return "color/pistils";
    default:
      return "general";
  }
}
