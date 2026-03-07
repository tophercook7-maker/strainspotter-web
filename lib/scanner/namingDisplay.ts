// lib/scanner/namingDisplay.ts
// Phase 3.5 Part C — User-Facing Display for Strain Naming

import type { NamingResult } from "./namingHierarchy";

/**
 * Phase 3.5 Part C — Generate user-facing display info for strain naming
 * Shows: name, "Closest known match" label, confidence range, rationale, image count
 */
export function generateNamingDisplay(
  namingResult: NamingResult,
  imageCount: number
): {
  matchType: "exact" | "closest_cultivar" | "strain_family";
  displayLabel: string;
  rationale: string;
} {
  // Phase 3.5 Part C — Display label based on match type
  let displayLabel: string;
  
  switch (namingResult.matchType) {
    case "exact":
      displayLabel = "Strong visual match";
      break;
    case "closest_cultivar":
      displayLabel = "Closest known match";
      break;
    case "strain_family":
      displayLabel = "Strain family match";
      break;
    default:
      displayLabel = "Closest known match";
  }

  // Phase 3.5 Part C — Enhanced rationale with image count
  let rationale = namingResult.rationale;
  
  // Ensure rationale mentions image count if not already present
  if (!rationale.includes(`${imageCount} image`)) {
    rationale = `${rationale} Analysis based on ${imageCount} image${imageCount > 1 ? "s" : ""}.`;
  }

  return {
    matchType: namingResult.matchType,
    displayLabel,
    rationale,
  };
}
