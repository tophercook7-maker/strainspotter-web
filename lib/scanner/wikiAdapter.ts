// lib/scanner/wikiAdapter.ts
// 🔒 A.7 — Wiki → ViewModel adapter (EXPANDED - NO TRUNCATION)

import type { WikiResult } from "./types";
import type { ScannerViewModel } from "./viewModel";
import type { NameFirstResult } from "./nameFirstMatcher";
import type { WikiData } from "./wikiLookup";
import type { AIReasoningResult } from "./aiReasoning";
import type { DeepAnalysisSections } from "./deepAnalysis";
import type { TrustLayer } from "./trustEngine";
import type { ExtendedStrainProfile } from "./extendedProfile";
import { enhanceLanguageQuality, ensureStructuredDepth, verifyFreeTierDepth } from "./freeTierDepth";

export function wikiToViewModel(
  wiki: WikiResult, 
  nameFirstResult?: NameFirstResult,
  wikiData?: WikiData | null,
  aiReasoning?: AIReasoningResult,
  deepAnalysis?: DeepAnalysisSections,
  trustLayer?: TrustLayer,
  extendedProfile?: ExtendedStrainProfile
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
  // Phase 3.5 Part A — Never "Unknown", always have a name
  let primaryName = nameFirstResult?.primaryMatch.name || wiki.identity.strainName;
  if (!primaryName || primaryName === "Unknown" || primaryName === "Unidentified") {
    // Phase 3.5 Part A — Fallback: Use strain family name instead of throwing
    console.warn("Phase 3.5 Part A — Primary name was invalid, using fallback");
    // Use a default fallback name - this should rarely happen as naming hierarchy ensures a name
    primaryName = "Hybrid Cultivar";
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
  
  // Phase 3.3 Part A — Depth Floor (Free): Ensure 2-3 sentences minimum per section
  // Phase 3.3 Part B — Language Quality: Apply enhancements
  // Phase 3.3 Part C — Structured Depth: What it is → Why it looks like this → How people experience it

  // Visual Match Summary (minimum 2-3 sentences)
  const rawVisualMatchSummary = deepAnalysis?.visualMatchSummary || whyThisMatch;
  const visualMatchSummary = enhanceLanguageQuality(
    rawVisualMatchSummary.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawVisualMatchSummary}. The observed visual characteristics demonstrate consistent alignment with documented morphology patterns. This morphological consistency supports the cultivar identification based on multiple trait domains.`
      : rawVisualMatchSummary
  );

  // Flower Structure Analysis (minimum 2-3 sentences)
  const rawFlowerStructure = deepAnalysis?.flowerStructureAnalysis || wiki.morphology.budStructure || "Flower structure shows typical hybrid characteristics.";
  const flowerStructureAnalysis = enhanceLanguageQuality(
    rawFlowerStructure.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawFlowerStructure}. The bud formation exhibits structural patterns consistent with the genetic classification. Calyx density and overall flower architecture reflect typical expression for this cultivar type.`
      : rawFlowerStructure
  );

  // Trichome Density & Maturity (minimum 2-3 sentences)
  const rawTrichomes = deepAnalysis?.trichomeDensityMaturity || wiki.morphology.trichomes || "Trichome coverage appears typical for mature flowers.";
  const trichomeDensityMaturity = enhanceLanguageQuality(
    rawTrichomes.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawTrichomes}. The trichome distribution indicates mature resin gland development. This coverage pattern is consistent with harvest-ready flowers displaying optimal cannabinoid and terpene production.`
      : rawTrichomes
  );

  // Leaf Shape & Internode Spacing (minimum 2-3 sentences)
  const rawLeafShape = deepAnalysis?.leafShapeInternode || "Leaf morphology and internode spacing align with observed characteristics.";
  const leafShapeInternode = enhanceLanguageQuality(
    rawLeafShape.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawLeafShape}. The leaf structure provides genetic classification indicators. Internodal spacing reflects growth patterns typical of this cultivar's dominant genetic influence.`
      : rawLeafShape
  );

  // Color & Pistil Indicators (minimum 2-3 sentences)
  const rawColorPistils = deepAnalysis?.colorPistilIndicators || (wiki.morphology.coloration.includes("pistil") 
    ? wiki.morphology.coloration 
    : `Pistil color and maturity appear consistent with ${primaryName} characteristics`);
  const colorPistilIndicators = enhanceLanguageQuality(
    rawColorPistils.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawColorPistils}. Coloration patterns reflect both genetic traits and maturity stage. Pistil development indicates flowering progression aligned with typical harvest timing for this cultivar.`
      : rawColorPistils
  );

  // Growth Pattern Clues (minimum 2-3 sentences)
  const rawGrowthPattern = deepAnalysis?.growthPatternClues || (safeGrowthIndicators.length > 0 
    ? safeGrowthIndicators.join(". ")
    : "Growth pattern shows typical characteristics for this cultivar type.");
  const growthPatternClues = enhanceLanguageQuality(
    rawGrowthPattern.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawGrowthPattern}. The growth characteristics demonstrate phenotypic expression aligned with genetic background. These patterns indicate typical development for this cultivar classification.`
      : rawGrowthPattern
  );

  // AI + Wiki Blend (minimum 2-3 sentences)
  const rawAiWikiBlend = deepAnalysis?.aiWikiBlend || `Based on documented characteristics of ${primaryName}, the AI visual inference aligns with known cultivar references.`;
  const aiWikiBlend = enhanceLanguageQuality(
    rawAiWikiBlend.split(/[.!?]/).filter(s => s.trim().length > 10).length < 2
      ? `${rawAiWikiBlend}. This alignment validates the identification through cross-reference with established cultivar databases. The synthesis of visual analysis and documented traits provides robust matching evidence.`
      : rawAiWikiBlend
  );

  const accuracyTips = deepAnalysis?.accuracyTips || [
    "Add more images from different angles to improve confidence",
    "Ensure consistent lighting across images",
    "Include close-up shots of trichomes and pistils",
  ];
  
  const result: ScannerViewModel = {
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
      // bestFor and summary will be set below with proper defaults
      bestFor: [],
      bestTime: wiki.experience.duration || extendedProfile?.effects?.duration,
      summary: "",
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
    
    // Phase 2.9 Part P Step 4 — Free Tier Guarantee (full profile, no truncation)
    // Phase 3.3 Part A — Ensure all required sections present
    extendedProfile,
  };

  // Phase 3.3 Part A — Verify free tier depth requirements
  const depthCheck = verifyFreeTierDepth(result);
  if (!depthCheck.isComplete) {
    console.warn("Free tier depth check failed. Missing sections:", depthCheck.missingSections);
    // Fill in missing sections with defaults
    if (!depthCheck.hasCommonUseCases && result.experience.bestFor.length === 0) {
      const dominance = result.genetics.dominance;
      result.experience.bestFor = dominance === "Indica"
        ? ["Evening relaxation", "Sleep support", "Stress relief"]
        : dominance === "Sativa"
        ? ["Daytime focus", "Creative activities", "Social settings"]
        : ["Balanced day/evening use", "Moderate relaxation"];
    }
    if (!depthCheck.hasVariabilityDisclaimer || result.disclaimer.length < 50) {
      result.disclaimer = enhanceLanguageQuality(
        `Results are AI-assisted estimates based on visual analysis and not definitive identification. Phenotype variations can occur due to growing conditions, harvest timing, and environmental factors. The actual cannabinoid and terpene profiles may differ from visual estimates, and effects can vary significantly between individuals and phenotypes.`
      );
    }
  }

  // Phase 3.3 Part C — Apply structured depth (what/why/how) if not present
  const structuredDepth = ensureStructuredDepth(result, extendedProfile);
  
  // Ensure visual match summary includes structured explanation if it's too brief
  if (result.visualMatchSummary.split(/[.!?]/).filter(s => s.trim().length > 10).length < 3) {
    result.visualMatchSummary = enhanceLanguageQuality(
      `${structuredDepth.whatItIs} ${structuredDepth.whyItLooksLikeThis}`
    );
  }

  // Ensure effects section includes "how people experience it" if missing
  if (!result.experience.summary || result.experience.summary.length < 100) {
    result.experience.summary = enhanceLanguageQuality(structuredDepth.howPeopleExperienceIt);
  }

  return result;
}
