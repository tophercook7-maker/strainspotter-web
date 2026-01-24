// lib/scanner/adapter/scanResultAdapter.ts
// Bridge layer: Adapts ScannerViewModel to old contract fields for UI compatibility

import type { ScannerViewModel } from "../viewModel";
import type { ScanMeta } from "../types";

export interface AdaptedScanResult {
  strainName: string;
  matchedStrainName: string; // alias
  matchConfidence: number | null; // 0-1 (not percent)
  confidence: number; // 0-100 (for backward compat)
  confidenceLabel: string;
  effects: string[];
  flavors: string[];
  warnings: string[];
  thc: number | null;
  cbd: number | null;
  summary: string | null;
  metadata: Record<string, any>;
}

export function adaptScanResult({
  scannerResult,
  scanMeta,
}: {
  scannerResult: ScannerViewModel;
  scanMeta?: ScanMeta | null;
}): AdaptedScanResult {
  // Extract primary strain name
  const primaryName = scannerResult.nameFirstDisplay?.primaryStrainName ?? scannerResult.name ?? "Unknown";
  
  // Calculate confidence (0-100)
  const confidencePercent = scannerResult.nameFirstDisplay?.confidencePercent ?? 
                           scannerResult.confidence ?? 
                           0;
  
  // Convert to 0-1 range for matchConfidence
  const matchConfidence = confidencePercent >= 60 ? confidencePercent / 100 : null;
  
  // Determine strain name based on confidence threshold
  const strainName = matchConfidence !== null && matchConfidence >= 0.6 
    ? primaryName 
    : "Cannabis (strain unknown)";
  
  // Confidence label
  let confidenceLabel = "Low Confidence";
  if (confidencePercent >= 90) confidenceLabel = "Very High Confidence";
  else if (confidencePercent >= 80) confidenceLabel = "High Confidence";
  else if (confidencePercent >= 70) confidenceLabel = "Moderate Confidence";
  else if (confidencePercent >= 60) confidenceLabel = "Low-Moderate Confidence";
  
  // Extract effects (always array, never undefined)
  const effects = scannerResult.experience?.effects ?? 
                  scannerResult.effectsShort ?? 
                  scannerResult.effectsLong ?? 
                  [];
  
  // Extract flavors/terpenes (always array)
  const flavors = scannerResult.terpeneGuess ?? [];
  
  // Extract warnings (always array)
  const warnings: string[] = [];
  if (scannerResult.uncertaintyExplanation) {
    warnings.push(scannerResult.uncertaintyExplanation);
  }
  if (scannerResult.accuracyTips && scannerResult.accuracyTips.length > 0) {
    warnings.push(...scannerResult.accuracyTips);
  }
  
  // Extract THC/CBD (if available in extended profile)
  let thc: number | null = null;
  let cbd: number | null = null;
  
  // Try to extract from extendedProfile if available
  if (scannerResult.extendedProfile?.cannabinoidProfile) {
    const thcStr = scannerResult.extendedProfile.cannabinoidProfile.thcRange;
    const cbdStr = scannerResult.extendedProfile.cannabinoidProfile.cbdRange;
    
    // Parse percentage strings like "20-25%" or "20%"
    if (thcStr) {
      const thcMatch = thcStr.match(/(\d+(?:\.\d+)?)/);
      if (thcMatch) thc = parseFloat(thcMatch[1]);
    }
    if (cbdStr) {
      const cbdMatch = cbdStr.match(/(\d+(?:\.\d+)?)/);
      if (cbdMatch) cbd = parseFloat(cbdMatch[1]);
    }
  }
  
  // Summary
  const summary = scannerResult.experience?.summary ?? 
                 scannerResult.aiWikiBlend ?? 
                 scannerResult.visualMatchSummary ?? 
                 null;
  
  // Metadata object
  const metadata: Record<string, any> = {
    confidenceRange: scannerResult.confidenceRange,
    matchBasis: scannerResult.matchBasis,
    genetics: scannerResult.genetics,
    primaryMatch: scannerResult.primaryMatch,
    trustLayer: scannerResult.trustLayer,
  };
  
  if (scanMeta) {
    metadata.scanMeta = scanMeta;
  }
  
  return {
    strainName,
    matchedStrainName: primaryName, // alias
    matchConfidence,
    confidence: confidencePercent,
    confidenceLabel,
    effects,
    flavors,
    warnings,
    thc,
    cbd,
    summary,
    metadata,
  };
}
