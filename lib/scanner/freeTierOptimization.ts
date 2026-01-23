// Phase 5.3.6 — FREE TIER OPTIMIZATION
// lib/scanner/freeTierOptimization.ts

/**
 * Phase 5.3.6 — FREE TIER OPTIMIZATION
 * 
 * Free tier always gets:
 * - Best name guess
 * - Confidence tier
 * - Core genetics summary
 * - Dominant terpenes
 * - Indica/Sativa/Hybrid ratio
 * 
 * No "crippled" feel.
 */

import type { ScannerViewModel } from "./viewModel";

export type FreeTierCoreFeatures = {
  hasBestNameGuess: boolean;
  hasConfidenceTier: boolean;
  hasCoreGeneticsSummary: boolean;
  hasDominantTerpenes: boolean;
  hasIndicaSativaRatio: boolean;
  isComplete: boolean;
  missingFeatures: string[];
};

/**
 * Phase 5.3.6 — Verify Free Tier Core Features
 * 
 * Ensures all core features are available for free tier users.
 * No features should be gated or hidden.
 */
export function verifyFreeTierCoreFeatures(viewModel: ScannerViewModel): FreeTierCoreFeatures {
  const missing: string[] = [];
  
  // 1. Best name guess (always available)
  const hasBestNameGuess = !!(
    viewModel.nameFirstDisplay?.primaryStrainName &&
    viewModel.nameFirstDisplay.primaryStrainName !== "Unknown" &&
    viewModel.nameFirstDisplay.primaryStrainName !== ""
  );
  if (!hasBestNameGuess) {
    missing.push("Best name guess");
  }
  
  // 2. Confidence tier (always available)
  const hasConfidenceTier = !!(
    viewModel.nameFirstDisplay?.confidenceTier ||
    viewModel.nameFirstDisplay?.confidencePercent !== undefined ||
    viewModel.nameFirstDisplay?.confidence !== undefined
  );
  if (!hasConfidenceTier) {
    missing.push("Confidence tier");
  }
  
  // 3. Core genetics summary (always available)
  const hasCoreGeneticsSummary = !!(
    viewModel.genetics?.dominance ||
    viewModel.genetics?.lineage ||
    viewModel.familyTree ||
    viewModel.extendedProfile?.genetics
  );
  if (!hasCoreGeneticsSummary) {
    missing.push("Core genetics summary");
  }
  
  // 4. Dominant terpenes (always available)
  const hasDominantTerpenes = !!(
    (viewModel.terpeneGuess && viewModel.terpeneGuess.length > 0) ||
    (viewModel.extendedProfile?.terpeneProfile?.primary && viewModel.extendedProfile.terpeneProfile.primary.length > 0) ||
    (viewModel.nameFirstDisplay?.terpeneExperience)
  );
  if (!hasDominantTerpenes) {
    missing.push("Dominant terpenes");
  }
  
  // 5. Indica/Sativa/Hybrid ratio (always available)
  const hasIndicaSativaRatio = !!(
    viewModel.ratio ||
    viewModel.finalRatio ||
    viewModel.stabilizedRatio ||
    (viewModel.nameFirstDisplay?.ratio)
  );
  if (!hasIndicaSativaRatio) {
    missing.push("Indica/Sativa/Hybrid ratio");
  }
  
  return {
    hasBestNameGuess,
    hasConfidenceTier,
    hasCoreGeneticsSummary,
    hasDominantTerpenes,
    hasIndicaSativaRatio,
    isComplete: missing.length === 0,
    missingFeatures: missing,
  };
}

/**
 * Phase 5.3.6 — Ensure Free Tier Features Are Always Available
 * 
 * Guarantees that all core features are populated, even if data is limited.
 * Never returns empty/null for core features.
 */
export function ensureFreeTierFeatures(viewModel: ScannerViewModel): ScannerViewModel {
  // Ensure best name guess (should already be guaranteed, but double-check)
  if (!viewModel.nameFirstDisplay?.primaryStrainName || 
      viewModel.nameFirstDisplay.primaryStrainName === "Unknown" ||
      viewModel.nameFirstDisplay.primaryStrainName === "") {
    // This should never happen due to fallback logic, but ensure it
    viewModel.nameFirstDisplay = {
      ...viewModel.nameFirstDisplay,
      primaryStrainName: "Closest Known Cultivar",
      confidencePercent: viewModel.nameFirstDisplay?.confidencePercent ?? 60,
      confidence: viewModel.nameFirstDisplay?.confidence ?? 60,
      confidenceTier: "medium" as const,
      explanation: {
        whyThisNameWon: ["Best available match based on visual analysis"],
      },
    };
  }
  
  // Ensure confidence tier (should already be present)
  if (!viewModel.nameFirstDisplay.confidenceTier) {
    const confidence = viewModel.nameFirstDisplay.confidencePercent ?? viewModel.nameFirstDisplay.confidence ?? 60;
    viewModel.nameFirstDisplay.confidenceTier = 
      confidence >= 90 ? "very_high" :
      confidence >= 75 ? "high" :
      confidence >= 60 ? "medium" : "low";
  }
  
  // Ensure core genetics summary (provide fallback if missing)
  if (!viewModel.genetics?.dominance && !viewModel.genetics?.lineage && !viewModel.familyTree) {
    // Provide basic genetics info based on ratio if available
    if (viewModel.ratio) {
      const dominance = viewModel.ratio.indica > viewModel.ratio.sativa
        ? "Indica"
        : viewModel.ratio.sativa > viewModel.ratio.indica
        ? "Sativa"
        : "Hybrid";
      viewModel.genetics = {
        ...viewModel.genetics,
        dominance: dominance as "Indica" | "Sativa" | "Hybrid",
      };
    } else {
      // Fallback: provide basic hybrid classification
      viewModel.genetics = {
        ...viewModel.genetics,
        dominance: "Hybrid" as const,
      };
    }
  }
  
  // Ensure dominant terpenes (provide fallback if missing)
  if (!viewModel.terpeneGuess || viewModel.terpeneGuess.length === 0) {
    // Provide basic terpene info based on strain family if available
    const strainName = viewModel.nameFirstDisplay.primaryStrainName.toLowerCase();
    const defaultTerpenes: string[] = [];
    
    if (strainName.includes("kush") || strainName.includes("og")) {
      defaultTerpenes.push("Myrcene", "Limonene", "Caryophyllene");
    } else if (strainName.includes("haze")) {
      defaultTerpenes.push("Terpinolene", "Myrcene", "Pinene");
    } else if (strainName.includes("cookies")) {
      defaultTerpenes.push("Limonene", "Caryophyllene", "Linalool");
    } else {
      // Generic terpene profile
      defaultTerpenes.push("Myrcene", "Limonene", "Caryophyllene");
    }
    
    viewModel.terpeneGuess = defaultTerpenes;
  }
  
  // Ensure Indica/Sativa/Hybrid ratio (provide fallback if missing)
  if (!viewModel.ratio && !viewModel.finalRatio && !viewModel.stabilizedRatio && !viewModel.nameFirstDisplay?.ratio) {
    // Fallback: balanced hybrid (use proper type structure)
    viewModel.ratio = {
      indicaPercent: 50,
      sativaPercent: 50,
      dominance: "Balanced" as const,
      hybridLabel: "Balanced Hybrid" as const,
      classification: "Balanced Hybrid",
    } as any; // Type assertion needed due to complex ratio type
  }
  
  return viewModel;
}
