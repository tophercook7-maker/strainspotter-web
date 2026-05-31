// Phase 5.2 — Multi-Image Guidance & Capture UX
// lib/scanner/multiImageGuidance.ts

/**
 * Phase 5.2 — Image Angle Types
 * 
 * The three key angles that provide best identification accuracy.
 */
export type ImageAngleType = "top" | "side" | "macro" | "unknown";

/**
 * Phase 5.2.1 — Image Slot Model
 * 
 * Defines 5 structured slots for image capture:
 * 1. Whole plant (structure) - Required
 * 2. Flower close-up (trichomes) - Recommended
 * 3. Side angle (bud shape) - Recommended
 * 4. Optional detail
 * 5. Optional detail
 */
export type ImageSlotType = 
  | "whole_plant"      // Slot 1: Whole plant (structure) - Required
  | "flower_closeup"   // Slot 2: Flower close-up (trichomes) - Recommended
  | "side_angle"       // Slot 3: Side angle (bud shape) - Recommended
  | "optional_detail"; // Slots 4-5: Optional detail

/**
 * Phase 5.2.1 — Image Slot Definition
 * 
 * Defines each slot with its purpose, requirement level, and description.
 */
export type ImageSlot = {
  slotNumber: 1 | 2 | 3 | 4 | 5;
  type: ImageSlotType;
  label: string;
  description: string;
  requirement: "required" | "recommended" | "optional";
  icon: string;
  filled: boolean;
  imageIndex?: number; // Which image (0-based) fills this slot
};

/**
 * Phase 5.2.1 — Image Slot Model Configuration
 * 
 * Defines all 5 slots with their properties.
 */
export const IMAGE_SLOT_MODEL: Omit<ImageSlot, "filled" | "imageIndex">[] = [
  {
    slotNumber: 1,
    type: "whole_plant",
    label: "Whole Plant",
    description: "Shows overall structure and plant form",
    requirement: "required",
    icon: "🌿",
  },
  {
    slotNumber: 2,
    type: "flower_closeup",
    label: "Flower Close-up",
    description: "Shows trichomes and bud detail",
    requirement: "recommended",
    icon: "🔍",
  },
  {
    slotNumber: 3,
    type: "side_angle",
    label: "Side Angle",
    description: "Shows bud shape and structure",
    requirement: "recommended",
    icon: "↔️",
  },
  {
    slotNumber: 4,
    type: "optional_detail",
    label: "Optional Detail",
    description: "Additional detail or different angle",
    requirement: "optional",
    icon: "📸",
  },
  {
    slotNumber: 5,
    type: "optional_detail",
    label: "Optional Detail",
    description: "Additional detail or different angle",
    requirement: "optional",
    icon: "📸",
  },
];

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
  
  // Phase 5.2.1 — Slot Model
  slots: ImageSlot[];
  filledSlots: number;
  requiredSlotsFilled: boolean; // Slot 1 (whole plant) is filled
  recommendedSlotsFilled: number; // How many of slots 2-3 are filled
  
  // Guidance messages
  primaryMessage: string;
  actionableTips: string[];
  confidenceImpact: string; // How current images affect confidence
  
  // Visual indicators
  recommendedNextAngle: ImageAngleType | null;
  recommendedNextSlot: ImageSlot | null; // Phase 5.2.1 — Next slot to fill
  diversityScore: number; // 0-1, how diverse current images are
  
  // Quality feedback
  qualityIssues: Array<{
    type: "lighting" | "focus" | "distance" | "angle";
    message: string;
    severity: "low" | "medium" | "high";
  }>;
};

/**
 * Phase 5.2.1 — Map Angle to Slot Type
 * 
 * Maps detected angle to appropriate slot type.
 */
function mapAngleToSlotType(angleType: ImageAngleType, imageIndex: number): ImageSlotType {
  // Slot 1: Whole plant (structure) - typically top or side view showing full plant
  if (imageIndex === 0) {
    return "whole_plant";
  }
  
  // Slot 2: Flower close-up (trichomes) - typically macro
  if (angleType === "macro" && imageIndex === 1) {
    return "flower_closeup";
  }
  
  // Slot 3: Side angle (bud shape) - typically side view
  if (angleType === "side" && imageIndex === 2) {
    return "side_angle";
  }
  
  // If angle matches slot 2 or 3 but wrong index, still assign if slot not filled
  if (angleType === "macro") {
    return "flower_closeup";
  }
  if (angleType === "side") {
    return "side_angle";
  }
  
  // Default: optional detail
  return "optional_detail";
}

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
  
  // Phase 5.2.1 — Initialize slots
  const slots: ImageSlot[] = IMAGE_SLOT_MODEL.map(slot => ({
    ...slot,
    filled: false,
  }));
  
  // Analyze each image's angle and assign to slots
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
    
    // Phase 5.2.1 — Assign image to slot based on slot model
    // Slot 1 (required): First image always goes here (whole plant)
    if (idx === 0) {
      slots[0].filled = true;
      slots[0].imageIndex = idx;
    }
    // Slot 2 (recommended): Flower close-up (macro angle)
    else if (idx === 1 && angleType === "macro") {
      slots[1].filled = true;
      slots[1].imageIndex = idx;
    }
    // Slot 3 (recommended): Side angle
    else if (idx === 1 && angleType === "side") {
      slots[2].filled = true;
      slots[2].imageIndex = idx;
    }
    // If second image doesn't match slot 2 or 3, try to assign based on type
    else if (idx === 1) {
      // If it's a macro, assign to slot 2; if side, assign to slot 3
      if (angleType === "macro" && !slots[1].filled) {
        slots[1].filled = true;
        slots[1].imageIndex = idx;
      } else if (angleType === "side" && !slots[2].filled) {
        slots[2].filled = true;
        slots[2].imageIndex = idx;
      } else {
        // Fallback: assign to first available recommended slot
        if (!slots[1].filled) {
          slots[1].filled = true;
          slots[1].imageIndex = idx;
        } else if (!slots[2].filled) {
          slots[2].filled = true;
          slots[2].imageIndex = idx;
        }
      }
    }
    // Third image: Fill remaining recommended slot or optional
    else if (idx === 2) {
      if (angleType === "side" && !slots[2].filled) {
        slots[2].filled = true;
        slots[2].imageIndex = idx;
      } else if (angleType === "macro" && !slots[1].filled) {
        slots[1].filled = true;
        slots[1].imageIndex = idx;
      } else {
        // Fill first available recommended slot, then optional
        if (!slots[1].filled) {
          slots[1].filled = true;
          slots[1].imageIndex = idx;
        } else if (!slots[2].filled) {
          slots[2].filled = true;
          slots[2].imageIndex = idx;
        } else if (!slots[3].filled) {
          slots[3].filled = true;
          slots[3].imageIndex = idx;
        }
      }
    }
    // Images 4-5: Fill optional slots
    else {
      if (!slots[3].filled) {
        slots[3].filled = true;
        slots[3].imageIndex = idx;
      } else if (!slots[4].filled) {
        slots[4].filled = true;
        slots[4].imageIndex = idx;
      }
    }
  });
  
  // Phase 5.2.1 — Calculate slot statistics
  const filledSlots = slots.filter(s => s.filled).length;
  const requiredSlotsFilled = slots[0].filled; // Slot 1 (whole plant) is required
  const recommendedSlotsFilled = slots.slice(1, 3).filter(s => s.filled).length; // Slots 2-3
  
  // Determine missing angles
  const allAngles: ImageAngleType[] = ["top", "side", "macro"];
  const missingAngles = allAngles.filter(angle => !capturedAngles.includes(angle));
  
  // Calculate diversity score
  const uniqueAngles = new Set(capturedAngles).size;
  const diversityScore = imageCount === 0 ? 0 : uniqueAngles / Math.max(3, imageCount);
  
  // Phase 5.2.1 — Determine recommended next slot
  let recommendedNextSlot: ImageSlot | null = null;
  if (!slots[0].filled) {
    recommendedNextSlot = slots[0]; // Slot 1 (whole plant) is required
  } else if (!slots[1].filled) {
    recommendedNextSlot = slots[1]; // Slot 2 (flower close-up) is recommended
  } else if (!slots[2].filled) {
    recommendedNextSlot = slots[2]; // Slot 3 (side angle) is recommended
  } else if (!slots[3].filled) {
    recommendedNextSlot = slots[3]; // Slot 4 (optional)
  } else if (!slots[4].filled) {
    recommendedNextSlot = slots[4]; // Slot 5 (optional)
  }
  
  // Determine recommended next angle (for backward compatibility)
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
  
  // Phase 5.2.1 — Generate primary message based on slot model
  let primaryMessage = "";
  if (imageCount === 0) {
    primaryMessage = "Upload at least 1 photo (whole plant view recommended)";
  } else if (!requiredSlotsFilled) {
    primaryMessage = "Add a whole plant view showing overall structure";
  } else if (imageCount === 1) {
    primaryMessage = "Add 1-2 more photos (flower close-up and side angle recommended)";
  } else if (recommendedSlotsFilled === 0) {
    primaryMessage = "Add flower close-up and side angle views for better accuracy";
  } else if (recommendedSlotsFilled === 1) {
    primaryMessage = recommendedNextSlot ? `Add ${recommendedNextSlot.label.toLowerCase()} for best results` : "Add one more recommended view";
  } else if (missingAngles.length === 0) {
    primaryMessage = "Great! You have diverse angles. Ready to scan.";
  } else {
    primaryMessage = `Add ${missingAngles.length} more angle${missingAngles.length > 1 ? "s" : ""} for optimal accuracy`;
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
    // Phase 5.2.1 — Slot Model
    slots,
    filledSlots,
    requiredSlotsFilled,
    recommendedSlotsFilled,
    primaryMessage,
    actionableTips,
    confidenceImpact,
    recommendedNextAngle,
    recommendedNextSlot, // Phase 5.2.1 — Next slot to fill
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
