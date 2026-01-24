// 🔒 SCANNER CORE — DO NOT MODIFY WITHOUT ARCH REVIEW
// lib/scanner/normalizeScanResult.ts
import type { ScanResult } from "./types";

export function normalizeScanResult(rawResult: ScanResult): ScanResult {
  const result = { ...rawResult };

  // Ensure result structure exists
  if ('error' in result || !result.result) {
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

  // 1. Guarantee a displayable strain name
  const currentName = result.result.nameFirstDisplay.primaryStrainName;
  
  if (
    !currentName ||
    currentName.trim() === "" ||
    currentName === "Unknown Cultivar" ||
    currentName === "Unknown" ||
    currentName === "Unidentified"
  ) {
    // Fallback chain
    const fallbackName = 
      result.result.name ||
      (result.consensus as any)?.primaryCandidate?.name ||
      "Closest Known Cultivar";
      
    result.result.nameFirstDisplay.primaryStrainName = fallbackName;
    
    // Sync primaryName alias
    result.result.nameFirstDisplay.primaryName = fallbackName;
  }

  // 2. If confidence is missing or too low, cap it between 55–65 instead of blocking
  // Ensure we have a valid confidence number
  let confidence = result.confidence ?? 0;
  
  if (confidence < 55) {
    confidence = Math.max(55, Math.min(confidence, 65));
    // If it was really low (e.g. 0), bump to at least 55
    if (confidence < 55) confidence = 55;
    
    result.confidence = confidence;
    
    // Sync with ViewModel
    if (result.result.nameFirstDisplay) {
      result.result.nameFirstDisplay.confidencePercent = confidence;
      result.result.nameFirstDisplay.confidence = confidence;
      result.result.nameFirstDisplay.confidenceTier = "low";
    }
  }

  // 3. Add user-facing explanation if confidence < 70
  if (confidence < 70) {
    // Only add if not already present or empty
    if (!result.scanNote) {
      result.scanNote = "Low confidence — visual similarity only. Results may vary.";
    }
  }

  return result;
}
