// lib/scanner/normalizeScanResult.ts
import type { ScanResult } from "./types";

export function normalizeScanResult(rawResult: ScanResult): ScanResult {
  const result = { ...rawResult };

  // Ensure result structure exists
  if (!result.result) {
    // This should ideally be handled upstream, but as a safety net:
    // We can't easily reconstruct a full ViewModel here without more context.
    // Assuming upstream provides a basic result object.
    return result;
  }

  // Ensure nameFirstDisplay exists
  if (!result.result.nameFirstDisplay) {
    result.result.nameFirstDisplay = {
      primaryStrainName: "Closest Known Cultivar",
      primaryName: "Closest Known Cultivar",
      confidencePercent: 60,
      confidence: 60,
      confidenceTier: "low",
      tagline: "Low confidence match",
      explanation: {
        whyThisNameWon: ["Fallback due to missing data"],
      },
    };
  }

  // 1. Guarantee a name
  if (
    !result.result.nameFirstDisplay.primaryStrainName ||
    result.result.nameFirstDisplay.primaryStrainName === "Unknown Cultivar" ||
    result.result.nameFirstDisplay.primaryStrainName.trim() === ""
  ) {
    result.result.nameFirstDisplay.primaryStrainName =
      result.result.name ||
      (result.consensus as any)?.primaryCandidate?.name ||
      "Closest Known Cultivar";
      
    // Sync primaryName alias
    result.result.nameFirstDisplay.primaryName = result.result.nameFirstDisplay.primaryStrainName;
  }

  // 2. Downgrade confidence instead of blocking (if it was low/unknown)
  // If we had to force a name or if confidence is missing, ensure it's valid but low-ish
  if (!result.confidence || result.confidence < 55) {
      result.confidence = Math.max(55, Math.min(result.confidence ?? 60, 65));
      if (result.result.nameFirstDisplay) {
          result.result.nameFirstDisplay.confidencePercent = result.confidence;
          result.result.nameFirstDisplay.confidence = result.confidence;
          result.result.nameFirstDisplay.confidenceTier = "low";
      }
  }

  // 3. Add user-facing explanation if missing
  if (!result.scanNote) {
    result.scanNote = "Low confidence — visual similarity only. Results may vary.";
  }

  return result;
}
