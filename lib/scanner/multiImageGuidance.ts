// Phase 5.2 — Multi-Image Guidance & Capture UX
// lib/scanner/multiImageGuidance.ts

/**
 * Phase 5.2 — Image Angle Types
 * 
 * The three key angles that provide best identification accuracy.
 */
export type ImageAngleType = "top" | "side" | "macro" | "unknown";

/**
 * Phase 5.2 — Angle Status
 * 
 * Tracks which angles have been captured and which are still needed.
 */
export type AngleStatus = {
  angle: ImageAngleType;
  captured: boolean;
  quality: "good" | "fair" | "poor" | "unknown";
  imageIndex?: number; // Which image (0-based) has this angle
};

/**
 * Phase 5.2 — Multi-Image Guidance Result
 * 
 * Provides actionable guidance to help users capture better images.
 */
export type MultiImageGuidance = {
  // Current state
  imageCount: number;
  capturedAngles: ImageAngleType[];
  missingAngles: ImageAngleType[];
  angleStatuses: AngleStatus[];
  
  // Guidance messages
  primaryMessage: string;
  actionableTips: string[];
  confidenceImpact: string; // How current images affect confidence
  
  // Visual indicators
  recommendedNextAngle: ImageAngleType | null;
  diversityScore: number; // 0-1, how diverse current images are
  
  // Quality feedback
  qualityIssues: Array<{
    type: "lighting" | "focus" | "distance" | "angle";
    message: string;
    severity: "low" | "medium" | "high";
  }>;
};

/**
 * Phase 5.2.1 — Analyze Current Image Set
 * 
 * Analyzes uploaded images and provides guidance on what to add next.
 */
export function analyzeImageSet(
  imagePreviews: Array<{ angleLabel: string; base64?: string }>,
  maxImages: number = 5
): MultiImageGuidance {
  const imageCount = imagePreviews.length;
  const capturedAngles: ImageAngleType[] = [];
  const angleStatuses: AngleStatus[] = [
    { angle: "top", captured: false, quality: "unknown" },
    { angle: "side", captured: false, quality: "unknown" },
    { angle: "macro", captured: false, quality: "unknown" },
  ];
  
  // Analyze each image's angle
  imagePreviews.forEach((preview, idx) => {
    const angleLabel = preview.angleLabel.toLowerCase();
    let angleType: ImageAngleType = "unknown";
    
    if (angleLabel.includes("top") || angleLabel.includes("canopy")) {
      angleType = "top";
    } else if (angleLabel.includes("side") || angleLabel.includes("profile")) {
      angleType = "side";
    } else if (angleLabel.includes("macro") || angleLabel.includes("close")) {
      angleType = "macro";
    }
    
    if (angleType !== "unknown") {
      capturedAngles.push(angleType);
      const status = angleStatuses.find(s => s.angle === angleType);
      if (status) {
        status.captured = true;
        status.imageIndex = idx;
        status.quality = "good"; // Default, could be enhanced with image analysis
      }
    }
  });
  
  // Determine missing angles
  const allAngles: ImageAngleType[] = ["top", "side", "macro"];
  const missingAngles = allAngles.filter(angle => !capturedAngles.includes(angle));
  
  // Calculate diversity score
  const uniqueAngles = new Set(capturedAngles).size;
  const diversityScore = imageCount === 0 ? 0 : uniqueAngles / Math.max(3, imageCount);
  
  // Determine recommended next angle
  let recommendedNextAngle: ImageAngleType | null = null;
  if (missingAngles.length > 0) {
    // Prioritize: side > macro > top (side view shows structure best)
    if (missingAngles.includes("side")) {
      recommendedNextAngle = "side";
    } else if (missingAngles.includes("macro")) {
      recommendedNextAngle = "macro";
    } else {
      recommendedNextAngle = missingAngles[0];
    }
  }
  
  // Generate primary message
  let primaryMessage = "";
  if (imageCount === 0) {
    primaryMessage = "Upload 1-5 photos of the same plant from different angles";
  } else if (imageCount === 1) {
    primaryMessage = "Add 1-2 more photos from different angles for better accuracy";
  } else if (missingAngles.length === 0) {
    primaryMessage = "Great! You have diverse angles. Ready to scan.";
  } else if (missingAngles.length === 1) {
    primaryMessage = `Add a ${recommendedNextAngle} view for best results`;
  } else {
    primaryMessage = `Add ${missingAngles.length} more angles (${missingAngles.join(", ")}) for optimal accuracy`;
  }
  
  // Generate actionable tips
  const actionableTips: string[] = [];
  
  if (imageCount === 0) {
    actionableTips.push("Start with a side view showing bud structure");
    actionableTips.push("Add a close-up of trichomes (macro shot)");
    actionableTips.push("Include a top-down view of the canopy");
  } else if (imageCount === 1) {
    if (capturedAngles.includes("side")) {
      actionableTips.push("Add a close-up macro shot of the buds");
      actionableTips.push("Or add a top-down view of the canopy");
    } else if (capturedAngles.includes("macro")) {
      actionableTips.push("Add a side view showing overall plant structure");
      actionableTips.push("Or add a top-down view of the canopy");
    } else {
      actionableTips.push("Add a side view showing bud structure");
      actionableTips.push("Add a close-up macro shot of trichomes");
    }
  } else if (missingAngles.length > 0) {
    missingAngles.forEach(angle => {
      if (angle === "side") {
        actionableTips.push("Side view: Shows bud structure and plant form");
      } else if (angle === "macro") {
        actionableTips.push("Macro shot: Close-up of trichomes and bud detail");
      } else if (angle === "top") {
        actionableTips.push("Top view: Shows canopy structure and leaf arrangement");
      }
    });
  } else {
    actionableTips.push("You have all key angles! Ready for high-confidence scan");
  }
  
  // Confidence impact message
  let confidenceImpact = "";
  if (imageCount === 0) {
    confidenceImpact = "No images yet";
  } else if (imageCount === 1) {
    confidenceImpact = "Single image limits confidence to ~82% max";
  } else if (imageCount === 2 && missingAngles.length === 0) {
    confidenceImpact = "2 diverse angles can reach ~90% confidence";
  } else if (imageCount >= 3 && missingAngles.length === 0) {
    confidenceImpact = "3+ diverse angles can reach up to 97-99% confidence";
  } else if (missingAngles.length > 0) {
    confidenceImpact = `Missing ${missingAngles.length} angle${missingAngles.length > 1 ? "s" : ""} may limit confidence`;
  } else {
    confidenceImpact = "Good angle diversity supports higher confidence";
  }
  
  // Quality issues (Phase 5.2.5 — Image quality hints)
  const qualityIssues: MultiImageGuidance["qualityIssues"] = [];
  
  // Add quality hints based on image count
  if (imageCount > 0 && imageCount < 3) {
    qualityIssues.push({
      type: "angle",
      message: "More angles improve accuracy",
      severity: "medium",
    });
  }
  
  // Phase 5.2.5 — General quality tips (shown when user has images)
  if (imageCount > 0) {
    qualityIssues.push({
      type: "lighting",
      message: "Ensure good lighting — avoid shadows or harsh backlight",
      severity: "low",
    });
    qualityIssues.push({
      type: "focus",
      message: "Keep images in focus — blurry photos reduce accuracy",
      severity: "low",
    });
    if (imageCount === 1) {
      qualityIssues.push({
        type: "distance",
        message: "Mix close-up and wider shots for best results",
        severity: "medium",
      });
    }
  }
  
  return {
    imageCount,
    capturedAngles,
    missingAngles,
    angleStatuses,
    primaryMessage,
    actionableTips,
    confidenceImpact,
    recommendedNextAngle,
    diversityScore,
    qualityIssues,
  };
}

/**
 * Phase 5.2.2 — Get Angle Display Label
 * 
 * Returns user-friendly label for angle type.
 */
export function getAngleDisplayLabel(angle: ImageAngleType): string {
  switch (angle) {
    case "top":
      return "Top View";
    case "side":
      return "Side View";
    case "macro":
      return "Macro Shot";
    case "unknown":
      return "Unknown";
    default:
      return "Unknown";
  }
}

/**
 * Phase 5.2.3 — Get Angle Icon/Emoji
 * 
 * Returns visual indicator for angle type.
 */
export function getAngleIcon(angle: ImageAngleType): string {
  switch (angle) {
    case "top":
      return "⬆️";
    case "side":
      return "↔️";
    case "macro":
      return "🔍";
    case "unknown":
      return "❓";
    default:
      return "❓";
  }
}

/**
 * Phase 5.2.4 — Get Angle Description
 * 
 * Returns helpful description of what this angle shows.
 */
export function getAngleDescription(angle: ImageAngleType): string {
  switch (angle) {
    case "top":
      return "Shows canopy structure and leaf arrangement";
    case "side":
      return "Shows bud structure and overall plant form";
    case "macro":
      return "Close-up of trichomes and bud detail";
    case "unknown":
      return "Angle not yet identified";
    default:
      return "";
  }
}
