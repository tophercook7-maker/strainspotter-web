// lib/scanner/wikiAdapter.ts
// 🔒 A.7 — Wiki → ViewModel adapter (EXPANDED - NO TRUNCATION)

import type { WikiResult } from "./types";
import type { ScannerViewModel } from "./viewModel";
import type { NameFirstResult } from "./nameFirstMatcher";
import type { WikiData } from "./wikiLookup";
import type { AIReasoningResult } from "./aiReasoning";

export function wikiToViewModel(
  wiki: WikiResult, 
  nameFirstResult?: NameFirstResult,
  wikiData?: WikiData | null,
  aiReasoning?: AIReasoningResult
): ScannerViewModel {
  const safeLineage = Array.isArray(wiki.genetics.lineage) ? wiki.genetics.lineage : [];
  const safeEffects = Array.isArray(wiki.experience.effects) ? wiki.experience.effects : [];
  const safePrimaryEffects = Array.isArray(wiki.experience.primaryEffects) ? wiki.experience.primaryEffects : [];
  const safeSecondaryEffects = Array.isArray(wiki.experience.secondaryEffects) ? wiki.experience.secondaryEffects : [];
  const safeVisualTraits = Array.isArray(wiki.morphology.visualTraits) ? wiki.morphology.visualTraits : [];
  const safeGrowthIndicators = Array.isArray(wiki.morphology.growthIndicators) ? wiki.morphology.growthIndicators : [];
  const safeTerpenes = Array.isArray(wiki.chemistry.terpenes) ? wiki.chemistry.terpenes : [];
  const safeAlternateMatches = Array.isArray(wiki.identity.alternateMatches) ? wiki.identity.alternateMatches : [];
  
  // Use name-first result if provided, otherwise fall back to wiki
  const primaryName = nameFirstResult?.primaryMatch.name || wiki.identity.strainName;
  const confidence = nameFirstResult?.confidence || Math.min(95, wiki.identity.confidence);
  
  // Phase 2.3 Part G — Use AI reasoning if available, otherwise fall back
  const whyThisMatch = aiReasoning?.explanation || 
    nameFirstResult?.primaryMatch.whyThisMatch || 
    wiki.reasoning?.whyThisMatch || 
    "Visual characteristics align with known cultivar profiles.";
  
  const alsoSimilar = nameFirstResult?.alsoSimilar || [];
  
  // Use wiki data for genetics if available
  const geneticsLineage = wikiData?.lineage || safeLineage;
  
  // Add sources if available
  const sources = wikiData?.sources || [];
  
  return {
    name: primaryName,
    title: primaryName, // Keep for backward compat
    confidence,
    whyThisMatch,
    morphology: wiki.morphology.budStructure || "Flower structure shows typical hybrid characteristics.",
    trichomes: wiki.morphology.trichomes || "Trichome coverage appears typical for mature flowers.",
    pistils: wiki.morphology.coloration.includes("pistil") 
      ? wiki.morphology.coloration 
      : `Pistil color and maturity appear consistent with ${wiki.identity.strainName} characteristics`,
    structure: wiki.morphology.budStructure || "Dense, conical flowers with heavy trichome coverage",
    growthTraits: safeGrowthIndicators.length > 0 
      ? safeGrowthIndicators 
      : ["Responds well to topping and low-stress training"],
    terpeneGuess: safeTerpenes.map(t => t.name),
    effectsShort: safePrimaryEffects.length > 0 ? safePrimaryEffects : safeEffects.slice(0, 3),
    effectsLong: [...safePrimaryEffects, ...safeSecondaryEffects, ...safeEffects],
    comparisons: alsoSimilar.length > 0 
      ? alsoSimilar.map(s => `${s.name} (${s.whyNotPrimary})`)
      : safeAlternateMatches.map(m => m.strainName),
    uncertaintyExplanation: nameFirstResult
      ? `Confidence: ${confidence}% (${nameFirstResult.imageCountBonus > 0 ? `+${nameFirstResult.imageCountBonus}% from multiple images` : ""}${nameFirstResult.variancePenalty > 0 ? `, -${nameFirstResult.variancePenalty}% variance penalty` : ""}). Visual identification has limitations and may not match genetic testing.`
      : wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0
      ? `Some visual traits show variance from typical profile: ${wiki.reasoning.conflictingSignals.join(", ")}. Visual identification has limitations and may not match genetic testing.`
      : `Visual characteristics strongly align with documented specimens. However, visual identification has limitations and may not match genetic testing.`,
    referenceStrains: alsoSimilar.length > 0
      ? alsoSimilar.map(s => s.name)
      : safeAlternateMatches.length > 0
      ? safeAlternateMatches.map(m => m.strainName)
      : [],
    genetics: {
      dominance: wiki.genetics.dominance,
      lineage: geneticsLineage.join(" × "),
    },
    experience: {
      effects: safeEffects, // NO SLICE - ALL EFFECTS
      bestFor: wiki.experience.bestUse || [],
      bestTime: wiki.experience.duration,
      summary: `Based on observed visual characteristics and growth patterns, this plant shows traits commonly associated with ${safeEffects[0]?.toLowerCase() || "calming"} effects. The morphology suggests a profile that may provide ${safeEffects.slice(0, 3).join(", ").toLowerCase() || "balanced"} experiences.`,
    },
    disclaimer:
      "Results are AI-assisted estimates and not definitive identification.",
    sources: sources.length > 0 ? sources : ["Curated Database"],
  };
}
