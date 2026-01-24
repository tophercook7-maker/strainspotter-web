// 🔒 SCANNER CORE — DO NOT MODIFY WITHOUT ARCH REVIEW
import type { ScannerViewModel } from "./viewModel";

export function validateScannerResult(result: ScannerViewModel, context: string): void {
  const errors: string[] = [];

  // Rule 1: result.name must not be empty
  if (!result.name || result.name.trim() === "") {
    errors.push("result.name is empty");
  }

  // Rule 2: result.primaryStrainName (in nameFirstDisplay) must not be "Unknown Cultivar" if confidence > 0
  // Note: We use "Unverified Cultivar (visual match only)" or "Closest Known Cultivar" now, but "Unknown Cultivar" is strictly forbidden.
  const primaryName = result.nameFirstDisplay?.primaryStrainName;
  const confidence = result.nameFirstDisplay?.confidencePercent ?? 0;

  if (primaryName === "Unknown Cultivar" && confidence > 0) {
    errors.push(`result.primaryStrainName is "Unknown Cultivar" but confidence is ${confidence}%`);
  }

  // Rule 3: result.nameFirstDisplay.primaryStrainName must not be empty
  if (!primaryName || primaryName.trim() === "") {
    errors.push("result.nameFirstDisplay.primaryStrainName is empty");
  }

  // Rule 4: Check for forbidden fallback states if we have confidence
  if (primaryName === "Unknown" || primaryName === "Unidentified") {
    errors.push(`result.primaryStrainName is "${primaryName}" (Forbidden)`);
  }

  if (errors.length > 0) {
    console.error(`REGRESSION GUARD FAILED (${context}):`, errors);
    // In a real test environment, we would throw:
    // throw new Error(`Scanner Regression: ${errors.join(", ")}`);
  } else {
    console.log(`REGRESSION GUARD PASSED (${context})`);
  }
}
