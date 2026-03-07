// lib/scanner/scanOrchestrator.ts
// GOAL: Restore v1 user experience while keeping v2 scanner intelligence.
// RESPONSIBILITIES:
// - Call runMultiScan()
// - Normalize results into a stable production-safe shape
// - NEVER throw
// - ALWAYS return a usable result for UI

import { scanImages } from "./runMultiScan";
import type { ScannerViewModel } from "./viewModel";
import { buildSafeFallbackResult } from "./scanFallbacks";
import { normalizeScanResult } from "./normalizeScanResult";
import type { ScanResult } from "./types";

export interface OrchestratedScanResult {
  displayName: string;
  confidencePercent: number;
  confidenceTier: "Low" | "Medium" | "High" | "Very High";
  summary: string[];
  warnings?: string[];
  rawScannerResult: ScannerViewModel;
  normalizedScanResult: ScanResult;
}

export async function orchestrateScan(images: File[]): Promise<OrchestratedScanResult> {
  let scanResult: ScanResult;

  try {
    // 1. Call runMultiScan (via scanImages wrapper)
    scanResult = await scanImages(images);
  } catch (error) {
    console.error("ORCHESTRATOR CAUGHT ERROR:", error);
    // Convert throw to safe fallback
    scanResult = buildSafeFallbackResult(
      "Scan encountered an error but recovered",
      images.length
    );
  }

  // 2. Handle explicit error result (if scanImages returns { error: true })
  if ('error' in scanResult && scanResult.error === true) {
     scanResult = buildSafeFallbackResult(
      scanResult.userMessage || "Scan completed with limited confidence",
      images.length
    );
  }

  // At this point, scanResult is either 'success' or 'partial' status
  // We cast it to the shape that has a result property
  // (The error case was handled above by replacing it with a fallback that has a result)
  if ('error' in scanResult) {
      // Should be unreachable, but for TS safety:
      scanResult = buildSafeFallbackResult("Unexpected error state", images.length);
  }

  // 3. Normalize the result (Double-check safety)
  // Although scanImages calls normalizeScanResult, we call it here to ensure
  // the orchestrator contract is enforced independently of the scanner internals.
  const normalized = normalizeScanResult(scanResult);
  
  // 4. Extract and Validate Fields
  // Ensure normalized is not an error type before accessing result
  if ('error' in normalized) {
      // This should be impossible due to previous checks, but satisfy TS
      const fallback = buildSafeFallbackResult("Normalization failed", images.length) as Extract<
        ScanResult,
        { result: ScannerViewModel }
      >;
      // Recurse once safely or just return fallback data
      // To avoid recursion loops, we'll manually construct the return
      return {
          displayName: "Low-confidence scan result",
          confidencePercent: 55,
          confidenceTier: "Low",
          summary: ["Fallback due to normalization error"],
          rawScannerResult: fallback.result, // We know fallback has result
          normalizedScanResult: fallback
      };
  }

  const viewModel = normalized.result;
  
  // Name Guarantee — reject placeholder cultivar names; allow real tentative matches
  const WEAK_NAMES = new Set([
    "closest known cultivar", "closest cultivar", "closest known strain",
    "unknown cultivar", "unknown", "unverified cultivar (visual match only)",
  ]);
  let displayName = viewModel.nameFirstDisplay?.primaryStrainName;
  const isWeak = !displayName || displayName.trim() === "" ||
    WEAK_NAMES.has(displayName.toLowerCase().trim()) || displayName.trim().length < 3;
  if (isWeak) {
    displayName = viewModel.name || "Low-confidence scan result";
    if (WEAK_NAMES.has((displayName || "").toLowerCase().trim()) || (displayName || "").trim().length < 3) {
      displayName = "Low-confidence scan result";
    }
  }

  // Confidence Guarantee
  let confidence = viewModel.nameFirstDisplay?.confidencePercent ?? viewModel.confidence ?? 0;
  if (confidence < 55) confidence = 55;

  // Tier Determination
  let tier: "Low" | "Medium" | "High" | "Very High" = "Low";
  if (confidence >= 90) tier = "Very High";
  else if (confidence >= 80) tier = "High";
  else if (confidence >= 65) tier = "Medium";

  // Summary Extraction
  const summary = viewModel.nameFirstDisplay?.explanation?.whyThisNameWon || ["Visual similarity match"];

  // Warning Extraction
  const warnings: string[] = [];
  if (normalized.scanWarning) warnings.push(normalized.scanWarning);
  if (normalized.diversityNote) warnings.push(normalized.diversityNote);

  return {
    displayName,
    confidencePercent: confidence,
    confidenceTier: tier,
    summary,
    warnings: warnings.length > 0 ? warnings : undefined,
    rawScannerResult: viewModel,
    normalizedScanResult: normalized
  };
}
