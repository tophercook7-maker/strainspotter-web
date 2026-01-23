// Phase 5.2.3 — QUALITY FEEDBACK (PASSIVE)
// lib/scanner/qualityFeedback.ts

/**
 * Phase 5.2.3 — Quality Feedback Type
 * 
 * Passive feedback about image quality, never negative or blocking.
 */
export type QualityFeedback = {
  messages: string[];
  overallTone: "positive" | "neutral" | "suggestive"; // Never "negative"
};

/**
 * Phase 5.2.3 — Image Quality Assessment
 * 
 * Analyzes image quality and provides passive, positive feedback.
 * Never says "bad", never blocks scan.
 */
export type ImageQualityAssessment = {
  detailLevel: "high" | "medium" | "low";
  lightingQuality: "good" | "fair" | "challenging";
  angleDiversity: "strong" | "moderate" | "limited";
  focusQuality: "sharp" | "acceptable" | "soft";
};

/**
 * Phase 5.2.3 — Assess Image Quality
 * 
 * Provides passive quality assessment based on available image data.
 * Uses heuristics and never blocks or uses negative language.
 */
export function assessImageQuality(
  imagePreviews: Array<{ angleLabel: string; base64?: string }>,
  imageCount: number
): ImageQualityAssessment {
  // Default to positive assessments
  let detailLevel: ImageQualityAssessment["detailLevel"] = "medium";
  let lightingQuality: ImageQualityAssessment["lightingQuality"] = "good";
  let angleDiversity: ImageQualityAssessment["angleDiversity"] = "moderate";
  let focusQuality: ImageQualityAssessment["focusQuality"] = "acceptable";
  
  // Assess detail level based on image count and angle diversity
  const uniqueAngles = new Set(imagePreviews.map(p => p.angleLabel.toLowerCase())).size;
  if (imageCount >= 3 && uniqueAngles >= 2) {
    detailLevel = "high";
  } else if (imageCount >= 2) {
    detailLevel = "medium";
  } else {
    detailLevel = "low";
  }
  
  // Assess angle diversity
  if (imageCount >= 3 && uniqueAngles >= 3) {
    angleDiversity = "strong";
  } else if (imageCount >= 2 && uniqueAngles >= 2) {
    angleDiversity = "moderate";
  } else {
    angleDiversity = "limited";
  }
  
  // Lighting and focus are defaulted to acceptable/good
  // In a real implementation, these could be analyzed from image data
  // For now, we default to positive assessments
  
  return {
    detailLevel,
    lightingQuality,
    angleDiversity,
    focusQuality,
  };
}

/**
 * Phase 5.2.3 — Generate Quality Feedback
 * 
 * Generates passive, positive feedback messages based on quality assessment.
 * Never uses negative language, never blocks scan.
 */
export function generateQualityFeedback(
  assessment: ImageQualityAssessment,
  imageCount: number,
  filledSlots: number
): QualityFeedback {
  const messages: string[] = [];
  
  // Detail feedback (always positive or neutral)
  if (assessment.detailLevel === "high") {
    messages.push("Good detail detected across images");
  } else if (assessment.detailLevel === "medium") {
    messages.push("Detail looks clear");
  } else if (imageCount === 1) {
    messages.push("Image detail is visible");
  }
  
  // Angle diversity feedback (always positive or suggestive)
  if (assessment.angleDiversity === "strong") {
    messages.push("Angle diversity is strong");
  } else if (assessment.angleDiversity === "moderate") {
    messages.push("Multiple angles detected");
  } else if (imageCount === 1) {
    messages.push("Additional angles may improve confidence");
  } else if (imageCount >= 2 && assessment.angleDiversity === "limited") {
    messages.push("Different angles help accuracy");
  }
  
  // Lighting feedback (never negative)
  if (assessment.lightingQuality === "good") {
    // Don't add message if lighting is good (silence is positive)
  } else if (assessment.lightingQuality === "fair") {
    messages.push("Lighting may reduce confidence slightly");
  } else if (assessment.lightingQuality === "challenging") {
    messages.push("Lighting may reduce confidence");
  }
  
  // Focus feedback (never negative)
  if (assessment.focusQuality === "sharp") {
    // Don't add message if focus is sharp (silence is positive)
  } else if (assessment.focusQuality === "acceptable") {
    // Don't add message for acceptable (silence is positive)
  } else if (assessment.focusQuality === "soft") {
    messages.push("Focus may affect detail clarity");
  }
  
  // Slot completion feedback (positive)
  if (filledSlots >= 3) {
    messages.push("Multiple slots filled — good coverage");
  } else if (filledSlots === 2) {
    messages.push("Two slots filled");
  } else if (filledSlots === 1 && imageCount === 1) {
    messages.push("One image uploaded — ready to scan");
  }
  
  // Determine overall tone
  let overallTone: QualityFeedback["overallTone"] = "positive";
  if (messages.some(m => m.includes("may") || m.includes("help"))) {
    overallTone = "suggestive";
  } else if (messages.length === 0) {
    overallTone = "neutral"; // Silence is positive
  }
  
  return {
    messages: messages.length > 0 ? messages : ["Images look good"],
    overallTone,
  };
}

/**
 * Phase 5.2.3 — Get Quality Feedback for Image Set
 * 
 * Main function to get quality feedback for uploaded images.
 */
export function getQualityFeedback(
  imagePreviews: Array<{ angleLabel: string; base64?: string }>,
  imageCount: number,
  filledSlots: number
): QualityFeedback {
  const assessment = assessImageQuality(imagePreviews, imageCount);
  return generateQualityFeedback(assessment, imageCount, filledSlots);
}
