// lib/scanner/confidenceCalibration.ts
import type { ScannerViewModel } from "./viewModel";
import { resolveFinalConfidenceV1 } from "./resolveFinalConfidenceV1";

/**
 * Calibrates the final confidence score and updates the view model.
 */
export function calibrateConfidence(args: {
  viewModel: ScannerViewModel;
  imageCount: number;
  distinctImageCount: number;
  hasDuplicates: boolean;
  samePlantLikely: boolean;
  avgImageQualityScore: number;
  consensusStrength: number;
  dbMatchStrength: number;
  nameStability: number;
  finalConfidence: number;
}): number {
  const { 
    viewModel, 
    imageCount, 
    samePlantLikely, 
    consensusStrength, 
    dbMatchStrength, 
    nameStability 
  } = args;

  let finalConfidence = args.finalConfidence;

  // Phase 4.5.1 — Name Memory Cache (bias already applied to finalConfidence if available)
  
  // Phase 4.0.3 — Confidence Calibration & User Trust Lock
  // Apply final confidence calibration using V1 engine (REALISTIC)
  const finalConfidenceV1 = resolveFinalConfidenceV1({
    imageCount,
    databaseMatchStrength: dbMatchStrength,
    imageAgreementScore: consensusStrength,
    namePipelineConfidence: nameStability,
    visualClarityScore: args.avgImageQualityScore,
    hasSimilarImages: samePlantLikely,
    hasFallbackName: viewModel.nameFirstDisplay?.primaryStrainName === "Closest Known Cultivar",
    hasWeakDatabaseMatch: dbMatchStrength < 0.7,
    previousConfidence: undefined, // TODO: Add session state for stability rule
  });
  
  finalConfidence = finalConfidenceV1.confidence;
  
  // Update name locking based on final confidence
  if (viewModel.nameFirstDisplay) {
    const shouldLockNameFinal = finalConfidence >= 75;
    (viewModel.nameFirstDisplay as any).isLocked = shouldLockNameFinal;
  }
  
  // Output structure - Attach to ScannerViewModel.confidencePercent and confidenceTier
  if (viewModel.nameFirstDisplay) {
    viewModel.nameFirstDisplay.confidencePercent = finalConfidence;
    viewModel.nameFirstDisplay.confidence = finalConfidence;
    
    const v1TierForDisplay = finalConfidenceV1.tier === "Very High" ? "very_high" as const
      : finalConfidenceV1.tier === "High" ? "high" as const
      : finalConfidenceV1.tier === "Medium" ? "medium" as const
      : "low" as const;
    viewModel.nameFirstDisplay.confidenceTier = v1TierForDisplay;
    
    (viewModel.nameFirstDisplay as any).nameConfidenceTier = finalConfidenceV1.tier;
    (viewModel.nameFirstDisplay as any).confidenceExplanation = finalConfidenceV1.explanation;
  }
  viewModel.confidence = finalConfidence;
  
  const v1TierValue = finalConfidenceV1.tier === "Very High" ? "very_high"
    : finalConfidenceV1.tier === "High" ? "high"
    : finalConfidenceV1.tier === "Medium" ? "medium"
    : "low";
  
  viewModel.confidenceTier = {
    tier: v1TierValue,
    label: finalConfidenceV1.tier,
    description: finalConfidenceV1.explanation,
  };
  
  viewModel.confidenceExplanation = {
    score: finalConfidence,
    tier: finalConfidenceV1.tier,
    explanation: [finalConfidenceV1.explanation],
  };
  
  if (viewModel.ratio) {
    (viewModel.ratio as any).needsEstimationNote = finalConfidence < 65;
  }

  // Safety floor: Ensure confidence is never below 55 for UX stability
  finalConfidence = Math.max(55, finalConfidence);
  
  // Add note for user guidance if confidence is low
  if (finalConfidence < 55) {
    if (!viewModel.notes) {
      viewModel.notes = [];
    }
    const hasLowConfidenceNote = viewModel.notes.some(note => 
      note.toLowerCase().includes("low confidence") || note.toLowerCase().includes("consider additional")
    );
    if (!hasLowConfidenceNote) {
      viewModel.notes.push("Low confidence — consider additional angles");
    }
  }

  return finalConfidence;
}
