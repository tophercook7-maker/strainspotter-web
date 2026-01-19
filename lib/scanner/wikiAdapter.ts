// lib/scanner/wikiAdapter.ts
// 🔒 A.7 — Wiki → ViewModel adapter (EXPANDED - NO TRUNCATION)

import type { WikiResult } from "./types";
import type { ScannerViewModel } from "./viewModel";
import type { NameFirstResult } from "./nameFirstMatcher";
import type { WikiData } from "./wikiLookup";
import type { AIReasoningResult } from "./aiReasoning";
import type { DeepAnalysisSections } from "./deepAnalysis";
import type { TrustLayer } from "./trustEngine";

export function wikiToViewModel(
  wiki: WikiResult, 
  nameFirstResult?: NameFirstResult,
  wikiData?: WikiData | null,
  aiReasoning?: AIReasoningResult,
  deepAnalysis?: DeepAnalysisSections,
  trustLayer?: TrustLayer
): ScannerViewModel {
  const safeLineage = Array.isArray(wiki.genetics.lineage) ? wiki.genetics.lineage : [];
  const safeEffects = Array.isArray(wiki.experience.effects) ? wiki.experience.effects : [];
  const safePrimaryEffects = Array.isArray(wiki.experience.primaryEffects) ? wiki.experience.primaryEffects : [];
  const safeSecondaryEffects = Array.isArray(wiki.experience.secondaryEffects) ? wiki.experience.secondaryEffects : [];
  const safeVisualTraits = Array.isArray(wiki.morphology.visualTraits) ? wiki.morphology.visualTraits : [];
  const safeGrowthIndicators = Array.isArray(wiki.morphology.growthIndicators) ? wiki.morphology.growthIndicators : [];
  const safeTerpenes = Array.isArray(wiki.chemistry.terpenes) ? wiki.chemistry.terpenes : [];
  const safeAlternateMatches = Array.isArray(wiki.identity.alternateMatches) ? wiki.identity.alternateMatches : [];
  
  // Phase 2.5 Part L Step 1 — Hard Require: Strain Name
  const primaryName = nameFirstResult?.primaryMatch.name || wiki.identity.strainName;
  if (!primaryName || primaryName === "Unknown") {
    throw new Error("Primary match name is required");
  }

  // Phase 2.5 Part L Step 2 — Confidence as Range
  const confidenceRange = nameFirstResult?.confidenceRange || {
    min: Math.max(60, (nameFirstResult?.confidence || wiki.identity.confidence) - 5),
    max: Math.min(99, (nameFirstResult?.confidence || wiki.identity.confidence) + 5),
    explanation: "Confidence range accounts for natural variation in visual characteristics and phenotype diversity.",
  };
  const confidence = nameFirstResult?.confidence || Math.min(95, wiki.identity.confidence); // Legacy

  // Phase 2.5 Part L Step 1 — Match Basis
  const matchBasis = `visual morphology across ${nameFirstResult ? "multiple" : "single"} image${nameFirstResult ? "s" : ""}`;

  // Phase 2.3 Part G — Use AI reasoning if available, otherwise fall back
  const whyThisMatch = aiReasoning?.explanation || 
    nameFirstResult?.primaryMatch.whyThisMatch || 
    wiki.reasoning?.whyThisMatch || 
    "Visual characteristics align with known cultivar profiles.";
  
  // Phase 2.5 Part L Step 4 — Multi-Cultivar Comparison
  const alsoSimilar = nameFirstResult?.alsoSimilar || [];
  const secondaryMatches = alsoSimilar.slice(0, 2).map(s => ({
    name: s.name,
    whyNotPrimary: s.whyNotPrimary,
  }));
  
  // Use wiki data for genetics if available
  const geneticsLineage = wikiData?.lineage || safeLineage;
  
  // Add sources if available
  const sources = wikiData?.sources || [];
  
  // Phase 2.5 Part L Step 3 — Deep Analysis Sections (use deepAnalysis if available)
  const visualMatchSummary = deepAnalysis?.visualMatchSummary || whyThisMatch;
  const flowerStructureAnalysis = deepAnalysis?.flowerStructureAnalysis || wiki.morphology.budStructure || "Flower structure shows typical hybrid characteristics.";
  const trichomeDensityMaturity = deepAnalysis?.trichomeDensityMaturity || wiki.morphology.trichomes || "Trichome coverage appears typical for mature flowers.";
  const leafShapeInternode = deepAnalysis?.leafShapeInternode || "Leaf morphology and internode spacing align with observed characteristics.";
  const colorPistilIndicators = deepAnalysis?.colorPistilIndicators || (wiki.morphology.coloration.includes("pistil") 
    ? wiki.morphology.coloration 
    : `Pistil color and maturity appear consistent with ${primaryName} characteristics`);
  const growthPatternClues = deepAnalysis?.growthPatternClues || (safeGrowthIndicators.length > 0 
    ? safeGrowthIndicators.join(". ")
    : "Growth pattern shows typical characteristics for this cultivar type.");
  const aiWikiBlend = deepAnalysis?.aiWikiBlend || `Based on documented characteristics of ${primaryName}, the AI visual inference aligns with known cultivar references.`;
  const accuracyTips = deepAnalysis?.accuracyTips || [
    "Add more images from different angles to improve confidence",
    "Ensure consistent lighting across images",
    "Include close-up shots of trichomes and pistils",
  ];
  
  return {
    // Phase 2.5 Part L Step 1 — Hard Require
    name: primaryName,
    title: primaryName, // Keep for backward compat
    confidenceRange, // Phase 2.5 Part L Step 2
    matchBasis, // Phase 2.5 Part L Step 1
    
    // Phase 2.5 Part L Step 3 — Deep Analysis Sections
    visualMatchSummary,
    flowerStructureAnalysis,
    trichomeDensityMaturity,
    leafShapeInternode,
    colorPistilIndicators,
    growthPatternClues,
    
    // Phase 2.5 Part L Step 4 — Multi-Cultivar Comparison
    primaryMatch: {
      name: primaryName,
      confidenceRange,
      whyThisMatch,
    },
    secondaryMatches,
    
    // Phase 2.5 Part L Step 6 — AI + Wiki Blend
    aiWikiBlend,
    
    // Phase 2.5 Part L Step 8 — Why Not 100% Certain
    uncertaintyExplanation: nameFirstResult
      ? `Confidence range: ${confidenceRange.min}–${confidenceRange.max}% (${confidenceRange.explanation}) Visual identification has limitations and may not match genetic testing.`
      : wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0
      ? `Some visual traits show variance from typical profile: ${wiki.reasoning.conflictingSignals.join(", ")}. Visual identification has limitations and may not match genetic testing.`
      : `Visual characteristics strongly align with documented specimens. However, visual identification has limitations and may not match genetic testing.`,
    
    // Phase 2.5 Part L Step 9 — How To Improve Accuracy
    accuracyTips,
    
    // Legacy fields (keep for backward compat)
    confidence,
    whyThisMatch,
    // Legacy fields (deprecated, use deep analysis sections above)
    morphology: flowerStructureAnalysis,
    trichomes: trichomeDensityMaturity,
    pistils: colorPistilIndicators,
    structure: flowerStructureAnalysis,
    growthTraits: safeGrowthIndicators.length > 0 
      ? safeGrowthIndicators 
      : ["Responds well to topping and low-stress training"],
    terpeneGuess: safeTerpenes.map(t => t.name),
    // Phase 2.5 Part L Step 5 — No Effect Claims First (effects come AFTER structure)
    effectsShort: safePrimaryEffects.length > 0 ? safePrimaryEffects : safeEffects.slice(0, 3),
    effectsLong: [...safePrimaryEffects, ...safeSecondaryEffects, ...safeEffects].map(e => 
      `Commonly reported for similar cultivars: ${e}`
    ),
    comparisons: alsoSimilar.length > 0 
      ? alsoSimilar.map(s => `${s.name} (${s.whyNotPrimary})`)
      : safeAlternateMatches.map(m => m.strainName),
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
    
    // Phase 2.8 Part O — Trust & Explanation Engine
    trustLayer: trustLayer || {
      confidenceBreakdown: {
        visualSimilarity: 70,
        traitOverlap: 70,
        consensusStrength: 60,
      },
      whyThisMatch: [
        "Visual characteristics align with known cultivar profiles",
        "Observed traits match documented morphology",
      ],
      sourcesUsed: sources.length > 0 ? sources : ["Curated Database"],
      confidenceLanguage: "Closest known match based on visual analysis",
    },
  };
}
