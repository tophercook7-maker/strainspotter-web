// lib/scanner/finalNameResolution.ts
import type { FusedFeatures } from "./multiImageFusion";
import { applyFamilyFirstConfidenceBoost } from "./familyFirstBoost";
import { getNameMemoryBias } from "./nameMemory";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
import { getStrainVisualBaseline, checkBaselineMatch } from "./strainVisualBaselines";
import { calculateVisualSimilarityIndex, getVisualSimilarityAdjustment, type VisualSimilarityIndexResult } from "./visualSimilarityIndex";
import type { ScannerViewModel } from "./viewModel";

/**
 * Resolves the final primary strain name and updates the view model.
 */
export function resolveFinalPrimaryName(args: {
  viewModel: ScannerViewModel;
  finalPrimaryName: string;
  finalNameConfidence: number;
  finalNameReasons: string[];
  finalNameIsLocked: boolean;
  phaseB1Result: any;
  phaseB2ConfidenceResult: any;
  imageResultsV3: any[];
  filteredInput: any;
  finalImageFingerprints: number[];
  disambiguationCopy: any;
  fusedFeatures: FusedFeatures | null;
  visualSignatures: any[];
}): { 
  finalPrimaryName: string; 
  finalNameConfidence: number; 
  finalNameReasons: string[]; 
  nameMemoryMatch: boolean;
  visualSimilarityResult: VisualSimilarityIndexResult | null;
} {
  const { 
    viewModel, 
    phaseB1Result, 
    phaseB2ConfidenceResult, 
    imageResultsV3, 
    filteredInput, 
    finalImageFingerprints, 
    disambiguationCopy, 
    fusedFeatures, 
    visualSignatures 
  } = args;

  let finalPrimaryName = args.finalPrimaryName;
  let finalNameConfidence = args.finalNameConfidence;
  let finalNameReasons = [...args.finalNameReasons];

  // Phase 4.8.6 — Ensure name is never empty (absolute safety)
  if (!finalPrimaryName || finalPrimaryName.trim() === "") {
    finalPrimaryName = "Closest Known Cultivar";
    console.error("Phase 4.8.6 — CRITICAL: Name was empty, forced fallback");
  }
  
  // Phase 4.6.2 — FAMILY-FIRST CONFIDENCE BOOST
  let familyFirstResult: ReturnType<typeof applyFamilyFirstConfidenceBoost> | null = null;
  try {
    const candidateStrains = phaseB1Result?.candidates.map((c: any) => ({
      name: c.strainName,
      confidence: c.score,
    })) || [];
    
    const finalConfidenceForFamilyCheck = phaseB2ConfidenceResult?.confidence ?? finalNameConfidence;
    
    const nameForFamilyDetection = finalPrimaryName === "Closest Known Cultivar" && candidateStrains.length > 0
      ? candidateStrains[0].name 
      : finalPrimaryName;
    
    familyFirstResult = applyFamilyFirstConfidenceBoost({
      primaryStrainName: nameForFamilyDetection,
      exactStrainConfidence: finalConfidenceForFamilyCheck,
      candidateStrains,
      imageCount: imageResultsV3.length || filteredInput.imageCount,
    });
    
    if (familyFirstResult.useFamilyFirst) {
      finalPrimaryName = familyFirstResult.displayFormat;
      finalNameConfidence = familyFirstResult.familyConfidence;
      finalNameReasons = [...finalNameReasons, ...familyFirstResult.explanation];
    }
  } catch (error) {
    console.warn("Phase 4.6.2 — Family-first boost error:", error);
  }
  
  // Update nameFirstDisplay
  if (viewModel.nameFirstDisplay) {
    viewModel.nameFirstDisplay.primaryStrainName = finalPrimaryName;
    viewModel.nameFirstDisplay.primaryName = finalPrimaryName;
  }

  const displayConfidence = familyFirstResult?.useFamilyFirst 
    ? familyFirstResult.familyConfidence 
    : (phaseB2ConfidenceResult?.confidence ?? finalNameConfidence);
  
  // Phase 4.5.2 — Confidence Stability Rule
  let stabilityAdjustedConfidence = displayConfidence;
  let nameMemoryMatch = false;
  
  if (finalPrimaryName && finalImageFingerprints.length > 0) {
    const cachedBias = getNameMemoryBias(finalImageFingerprints);
    if (cachedBias) {
      const nameMatches = cachedBias.name === finalPrimaryName;
      if (nameMatches) {
        nameMemoryMatch = true;
        const stabilityBoost = Math.min(3, 95 - displayConfidence);
        stabilityAdjustedConfidence = displayConfidence + stabilityBoost;
      } else {
        const stabilityPenalty = Math.min(10, displayConfidence - 55);
        stabilityAdjustedConfidence = Math.max(55, displayConfidence - stabilityPenalty);
      }
    }
  }
  
  // Phase 4.8.5 — Clone-based calibration
  if (disambiguationCopy && disambiguationCopy.hasClones) {
    if (stabilityAdjustedConfidence > 97) {
      stabilityAdjustedConfidence = 97;
      finalNameReasons.push("Multiple named cuts detected — confidence capped to reflect variant uncertainty");
    } else {
      finalNameReasons.push("Multiple named cuts detected — exact variant may vary");
    }
  }
  
  // Phase 4.9 — VISUAL SIMILARITY INDEX
  let visualSimilarityResult: VisualSimilarityIndexResult | null = null;
  let visualSimilarityAdjustedConfidence = stabilityAdjustedConfidence;
  
  if (fusedFeatures && finalPrimaryName && finalPrimaryName !== "Closest Known Cultivar") {
    try {
      const dbEntryForVisual = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === finalPrimaryName.toLowerCase() ||
        s.aliases?.some(a => a.toLowerCase() === finalPrimaryName.toLowerCase())
      );
      
      if (dbEntryForVisual) {
        const visualBaseline = getStrainVisualBaseline(dbEntryForVisual);
        visualSimilarityResult = calculateVisualSimilarityIndex(fusedFeatures, dbEntryForVisual);
        
        let baselineAdjustedScore = visualSimilarityResult.overallScore;
        if (visualSignatures && visualSignatures.length > 0) {
          const primarySignature = visualSignatures[0];
          const baselineMatch = checkBaselineMatch(primarySignature, visualBaseline);
          baselineAdjustedScore = Math.round(visualSimilarityResult.overallScore * 0.7 + baselineMatch.overallMatch * 0.3);
          
          visualSimilarityResult = {
            ...visualSimilarityResult,
            overallScore: baselineAdjustedScore,
            explanation: [...visualSimilarityResult.explanation, ...baselineMatch.explanation],
          };
        }
        
        const visualAdjustment = getVisualSimilarityAdjustment(baselineAdjustedScore);
        visualSimilarityAdjustedConfidence = Math.max(50, Math.min(stabilityAdjustedConfidence + visualAdjustment.adjustment, 99));
      }
    } catch (error) {
      console.warn("Phase 4.9 — Visual similarity calculation error:", error);
    }
  }

  return {
    finalPrimaryName,
    finalNameConfidence: visualSimilarityAdjustedConfidence,
    finalNameReasons,
    nameMemoryMatch,
    visualSimilarityResult,
  };
}
