// Phase 5.2.3 — Quality Feedback (PASSIVE)
// lib/scanner/qualityFeedback.ts

/**
 * Phase 5.2.3 — Quality Feedback Result
 * 
 * Provides passive quality feedback to users about their uploaded images.
 * Never says "bad", never blocks scan.
 */
export type QualityFeedback = {
  messages: string[];
  overallTone: "positive" | "suggestive" | "neutral";
};

/**
 * Phase 5.2.3 — Detect Good Detail
 * 
 * Uses base64 size as a proxy for image detail (larger = more detail).
 * This is a simple heuristic - actual detail detection would require image analysis.
 */
function detectGoodDetail(imagePreviews: Array<{ base64?: string }>): boolean {
  if (imagePreviews.length === 0) return false;
  
  // Check if images have substantial base64 data (proxy for detail)
  const avgSize = imagePreviews.reduce((sum, preview) => {
    const size = preview.base64?.length || 0;
    return sum + size;
  }, 0) / imagePreviews.length;
  
  // Threshold: ~500KB base64 (roughly 375KB original) suggests good detail
  return avgSize > 500000;
}

/**
 * Phase 5.2.3 — Assess Angle Diversity
 * 
 * Checks if images have diverse angles.
 */
function assessAngleDiversity(imagePreviews: Array<{ angleLabel: string }>): {
  isStrong: boolean;
  uniqueAngles: number;
} {
  if (imagePreviews.length === 0) {
    return { isStrong: false, uniqueAngles: 0 };
  }
  
  const uniqueAngles = new Set(
    imagePreviews.map(p => p.angleLabel.toLowerCase())
  ).size;
  
  // Strong diversity: 2+ unique angles, or 3+ images with at least 2 angles
  const isStrong = uniqueAngles >= 2 || (imagePreviews.length >= 3 && uniqueAngles >= 2);
  
  return { isStrong, uniqueAngles };
}

/**
 * Phase 5.2.3 — Get Quality Feedback
 * 
 * Analyzes image previews and provides passive quality feedback messages.
 * Requirements:
 * - "Good detail detected"
 * - "Lighting may reduce confidence"
 * - "Angle diversity is strong"
 * - Never say "bad"
 * - Never stop scan
 */
export function getQualityFeedback(
  imagePreviews: Array<{ angleLabel: string; base64?: string }>,
  imageCount: number,
  filledSlots: number
): QualityFeedback {
  const messages: string[] = [];
  let tone: QualityFeedback["overallTone"] = "neutral";
  
  // Phase 5.2.3 — Good detail detection
  if (imageCount > 0) {
    const hasGoodDetail = detectGoodDetail(imagePreviews);
    if (hasGoodDetail) {
      messages.push("Good detail detected");
      tone = "positive";
    }
  }
  
  // Phase 5.2.3 — Angle diversity assessment
  const angleDiversity = assessAngleDiversity(imagePreviews);
  if (angleDiversity.isStrong) {
    messages.push("Angle diversity is strong");
    if (tone !== "positive") tone = "positive";
  } else if (imageCount >= 2 && angleDiversity.uniqueAngles === 1) {
    // Multiple images but same angle - suggest diversity
    messages.push("Different angles may improve confidence");
    if (tone === "neutral") tone = "suggestive";
  }
  
  // Phase 5.2.3 — Lighting feedback (always passive, never says "bad")
  if (imageCount > 0) {
    // Provide general lighting guidance (we can't detect lighting from base64 alone)
    // But we can suggest it as a general tip
    if (messages.length === 0 || tone === "neutral") {
      messages.push("Good lighting helps accuracy");
      tone = "suggestive";
    } else {
      // Add as secondary message if we already have positive feedback
      messages.push("Lighting may reduce confidence if too dark or overexposed");
      // Keep tone as is (don't downgrade from positive)
    }
  }
  
  // Phase 5.2.3 — Slot coverage feedback (complementary to quality)
  if (filledSlots >= 3) {
    if (!messages.some(m => m.includes("diversity") || m.includes("angle"))) {
      messages.push("Good slot coverage");
      if (tone !== "positive") tone = "positive";
    }
  } else if (filledSlots === 2 && messages.length === 0) {
    messages.push("Adding one more angle may improve accuracy");
    tone = "suggestive";
  }
  
  // Phase 5.2.3 — Fallback: neutral guidance if no messages
  if (messages.length === 0) {
    messages.push("Upload 1-5 photos from different angles for best results");
    tone = "neutral";
  }
  
  return {
    messages,
    overallTone: tone,
  };
}
