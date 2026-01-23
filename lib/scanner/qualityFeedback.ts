// Phase 5.2.3 — Quality Feedback
// lib/scanner/qualityFeedback.ts

/**
 * Phase 5.2.3 — Quality Feedback Result
 * 
 * Provides passive quality feedback to users about their uploaded images.
 */
export type QualityFeedback = {
  messages: string[];
  overallTone: "positive" | "suggestive" | "neutral";
};

/**
 * Phase 5.2.3 — Get Quality Feedback
 * 
 * Analyzes image previews and provides quality feedback messages.
 */
export function getQualityFeedback(
  imagePreviews: Array<{ angleLabel: string; base64?: string }>,
  imageCount: number,
  filledSlots: number
): QualityFeedback {
  const messages: string[] = [];
  let tone: QualityFeedback["overallTone"] = "neutral";
  
  // Positive feedback for good slot coverage
  if (filledSlots >= 3) {
    messages.push("Great! You have diverse angles. Ready for high-confidence scan.");
    tone = "positive";
  } else if (filledSlots === 2) {
    messages.push("Good start! Adding one more angle (flower close-up or side view) will improve accuracy.");
    tone = "suggestive";
  } else if (filledSlots === 1 && imageCount === 1) {
    messages.push("Add at least one more photo (flower close-up or side angle) for better results.");
    tone = "suggestive";
  }
  
  // Slot-specific suggestions
  if (filledSlots < 2) {
    messages.push("Recommended: Add a flower close-up (trichomes) and side angle (bud shape) for best accuracy.");
    tone = "suggestive";
  }
  
  // If no messages yet, provide neutral guidance
  if (messages.length === 0) {
    messages.push("Upload 1-5 photos from different angles for best results.");
    tone = "neutral";
  }
  
  return {
    messages,
    overallTone: tone,
  };
}
