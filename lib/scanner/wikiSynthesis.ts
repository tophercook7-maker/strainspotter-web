// lib/scanner/wikiSynthesis.ts
// 🔒 B.2 — AI SYNTHESIS LAYER (READ-ONLY, NO UI CHANGE)

import type { WikiResult, WikiSynthesis } from "./types";

/**
 * 🔒 B.2.1 & B.2.3 — Synthesize insights from WikiResult
 * Rules:
 * - Plain language, neutral, educational tone
 * - No marketing language, no confidence inflation
 * - Cite fields from reasoning, genetics, chemistry, experience
 * - Explicitly mention uncertainty when present
 * - Never state lab certainty
 * - Avoid absolutes
 * - Make content extensive: 2-3 paragraphs per section
 */
export function synthesizeWikiInsights(wiki: WikiResult): WikiSynthesis {
  const strainName = wiki.identity.strainName;
  const confidence = wiki.identity.confidence;
  const dominance = wiki.genetics.dominance;
  const safeLineage = Array.isArray(wiki.genetics.lineage) ? wiki.genetics.lineage : [];
  const lineage = safeLineage.join(" × ");
  const reasoningText = wiki.reasoning?.whyThisMatch || "";
  const hasUncertainty = wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0;
  const primaryEffects = wiki.experience.primaryEffects || wiki.experience.effects.slice(0, 2);
  const terpenes = wiki.chemistry.terpenes;
  const topTerpene = terpenes[0]?.name || "";
  const topThreeTerpenes = terpenes.slice(0, 3).map(t => t.name);
  const cannabinoidRange = wiki.chemistry.cannabinoidRange || `${wiki.chemistry.cannabinoids.THC}, ${wiki.chemistry.cannabinoids.CBD}`;
  const visualTraits = wiki.morphology.visualTraits || [];
  const growthIndicators = wiki.morphology.growthIndicators || [];

  // Generate seed-based variation for wording (to make confidence/uncertainty phrasing vary)
  let seed = 0;
  // Use strainName + confidence to create deterministic but varied seed
  for (let i = 0; i < strainName.length; i++) {
    seed += strainName.charCodeAt(i);
  }
  seed = (seed + confidence) % 4; // 0-3 variation

  // Safe arrays
  const safeTopThreeTerpenes = Array.isArray(topThreeTerpenes) ? topThreeTerpenes : [];
  const safePrimaryEffects = Array.isArray(primaryEffects) ? primaryEffects : [];
  const safeVisualTraits = Array.isArray(visualTraits) ? visualTraits : [];
  const safeGrowthIndicators = Array.isArray(growthIndicators) ? growthIndicators : [];
  const safeConflictingSignals = Array.isArray(wiki.reasoning?.conflictingSignals) ? wiki.reasoning.conflictingSignals : [];

  // Phase 2.1: STRONG OPENING PARAGRAPH (3-4 sentences)
  // Names the closest cultivar immediately, explains WHY, mentions visible traits, sets expectations
  const openingParagraph = `This plant most closely aligns with ${strainName}, a well-documented ${dominance.toLowerCase()}-leaning cultivar. ` +
    `The identification is driven by observed flower structure, ${wiki.morphology.trichomes.toLowerCase()}, and leaf morphology consistent with known ${strainName} phenotypes. ` +
    `Visual analysis reveals ${wiki.morphology.budStructure.toLowerCase()}, with ${wiki.morphology.coloration.toLowerCase()} that aligns with documented specimens of this cultivar. ` +
    `This assessment is based on visual similarity to reference materials and should not be considered a genetic confirmation; laboratory testing provides definitive identification.`;

  // Generate summary (expanded with opening paragraph)
  const summary: string[] = [
    openingParagraph,
    
    `Genetic analysis indicates ${dominance} dominance with lineage tracing to ${lineage}. ` +
    `Terpene likelihoods suggest ${topTerpene} as a primary compound, with ${safeTopThreeTerpenes.slice(1).join(" and ")} also present in the profile. ` +
    `These terpene inferences are based on visual characteristics and typical profiles for this cultivar type, not direct chemical analysis.`,
    
    `Effects typically include ${safePrimaryEffects.join(", ").toLowerCase()}, which aligns with the ${dominance.toLowerCase()} genetic profile. ` +
    `The morphology data shows ${wiki.morphology.budStructure.toLowerCase()}, with ${wiki.morphology.coloration.toLowerCase()}. ` +
    `Trichome characteristics (${wiki.morphology.trichomes.toLowerCase()}) suggest appropriate maturity for analysis. ` +
    `However, identification relies on visual analysis rather than laboratory testing, and natural variation between phenotypes is expected.`
  ].filter(p => p.length > 0);

  // Generate whyThisMatters (2-3 paragraphs)
  const whyThisMatters: string[] = [
    `Understanding genetic dominance (${dominance}) helps predict typical effects and user experience. ` +
    `Indica-dominant cultivars generally produce body-focused, relaxing effects, while sativa-dominant varieties tend toward energetic, cerebral experiences. ` +
    `Hybrid cultivars balance these influences in ways that vary by phenotype and growing conditions.`,
    
    `Lineage information (${lineage}) provides context about the cultivar's genetic background and breeding history. ` +
    `This helps understand why certain traits appear and how the cultivar might respond to different cultivation techniques. ` +
    `Terpene profiles influence both aroma and how cannabinoids interact with receptors in the endocannabinoid system.`,
    
    `The estimated ${cannabinoidRange} cannabinoid range is based on visual characteristics and typical profiles for this cultivar type. ` +
    `These values are not laboratory-verified. Actual cannabinoid content can vary significantly based on growing conditions, harvest timing, and phenotype. ` +
    `Laboratory testing provides the most accurate cannabinoid measurements.`
  ];

  // Generate uncertaintyExplanation (2-3 paragraphs with seed-based wording variation)
  const confidencePhrasings = [
    `estimated at ${confidence}% confidence`,
    `assessed with ${confidence}% confidence`,
    `calculated with ${confidence}% confidence`,
    `reported at ${confidence}% confidence`
  ];
  const confidencePhrasing = confidencePhrasings[seed];

  const uncertaintyExplanation: string[] = hasUncertainty
    ? [
        `Visual analysis shows conflicting traits: ${safeConflictingSignals.join(", ")}. ` +
        `This analysis is ${confidencePhrasing}, reflecting the ambiguity present in the visual data. ` +
        `Identification relies on visual similarity to documented specimens, not laboratory testing.`,
        
        `Environmental factors such as lighting, nutrients, and growing techniques can cause significant deviations from typical profiles. ` +
        `Phenotype variation within the same genetic line can also produce plants with different visual characteristics. ` +
        `These factors contribute to the uncertainty in visual-based identification.`,
        
        `When conflicting signals are present, cross-referencing with laboratory testing or multiple identification methods may be useful. ` +
        `The presence of alternate matches (${wiki.identity.alternateMatches?.[0]?.strainName || "similar cultivars"}) suggests visual similarity with other varieties that may require further investigation.`
      ]
    : confidence < 80
    ? [
        `This analysis is ${confidencePhrasing}. Visual characteristics align with documented specimens, ` +
        `but cannabis identification involves inherent uncertainty. Phenotypic variation, growing conditions, and visual similarities ` +
        `between cultivars can affect accuracy. This is not laboratory-verified.`,
        
        `Lower confidence scores typically indicate that visual characteristics match known patterns but with some variance. ` +
        `This could result from environmental influences, phenotype expression, or similarities with other cultivars. ` +
        `Laboratory testing would provide definitive identification and cannabinoid quantification.`,
        
        `For cultivation purposes, understanding the genetic dominance and typical effects profile may be more useful than exact strain identification. ` +
        `The ${dominance.toLowerCase()} characteristics and expected effects (${safePrimaryEffects.join(", ").toLowerCase()}) provide practical guidance regardless of cultivar name accuracy.`
      ]
    : [
        `This analysis is ${confidencePhrasing}. While visual characteristics show strong alignment with documented profiles, ` +
        `identification is based on visual analysis, not laboratory testing. Cannabis cultivars can show natural variation.`,
        
        `Higher confidence scores indicate strong visual alignment between the analyzed specimen and documented genetic profiles. ` +
        `However, even with strong visual matches, environmental factors and phenotype variation can cause deviations. ` +
        `The estimated cannabinoid range (${cannabinoidRange}) reflects typical values but may not match this specific specimen.`,
        
        `For definitive identification and cannabinoid quantification, laboratory testing remains the gold standard. ` +
        `Visual analysis provides useful estimates but cannot replace chemical analysis for precise measurement.`
      ];

  // Generate signalsConsidered (explicit reasoning)
  const signalsConsidered: string[] = [];
  
  if (reasoningText) {
    signalsConsidered.push(`Morphological analysis: ${reasoningText}`);
  }
  
  if (visualTraits.length > 0) {
    signalsConsidered.push(`Visual traits observed: ${safeVisualTraits.slice(0, 3).join(", ")}`);
  }
  
  if (wiki.morphology.budStructure) {
    signalsConsidered.push(`Bud structure: ${wiki.morphology.budStructure}`);
  }
  
  if (wiki.morphology.coloration) {
    signalsConsidered.push(`Coloration patterns: ${wiki.morphology.coloration}`);
  }
  
  if (wiki.morphology.trichomes) {
    signalsConsidered.push(`Trichome characteristics: ${wiki.morphology.trichomes}`);
  }
  
  if (topThreeTerpenes.length > 0) {
    signalsConsidered.push(`Terpene likelihoods: ${safeTopThreeTerpenes.join(", ")} (from chemistry analysis)`);
  }
  
  if (wiki.genetics.lineage.length > 0) {
    signalsConsidered.push(`Genetic lineage indicators: ${lineage}`);
  }
  
  if (hasUncertainty && wiki.reasoning?.conflictingSignals) {
    signalsConsidered.push(`Conflicting signals: ${safeConflictingSignals.join("; ")}`);
  }

  // Generate patternsObserved (explicit reasoning)
  const patternsObserved: string[] = [];
  
  if (wiki.genetics.dominance === "Indica") {
    patternsObserved.push(`${dominance} dominance from genetics suggests body-focused effects are more likely than energizing ones`);
  } else if (wiki.genetics.dominance === "Sativa") {
    patternsObserved.push(`${dominance} leaning from genetics typically associates with daytime, energetic effects`);
  } else {
    patternsObserved.push(`${dominance} genetics balance both indica and sativa influences, with effects varying by phenotype`);
  }

  if (wiki.experience.onset) {
    patternsObserved.push(`Onset pattern (${wiki.experience.onset}) from experience data suggests effects may develop ${wiki.experience.onset === "Quick" ? "rapidly" : wiki.experience.onset === "Gradual" ? "over time" : "moderately"}`);
  }

  if (terpenes.length >= 2) {
    patternsObserved.push(`Terpene profile (${safeTopThreeTerpenes.join(", ")}) from chemistry data influences both aroma and how cannabinoids interact with receptors`);
  }

  if (growthIndicators.length > 0) {
    patternsObserved.push(`Growth indicators suggest: ${safeGrowthIndicators.join(", ")}`);
  }

  if (wiki.identity.alternateMatches && wiki.identity.alternateMatches.length > 0) {
    const altName = wiki.identity.alternateMatches[0].strainName;
    patternsObserved.push(`Alternate matches suggest similar visual characteristics with ${altName}; cross-referencing may be useful`);
  }

  if (wiki.experience.varianceNotes) {
    patternsObserved.push(`Experience variance: ${wiki.experience.varianceNotes}`);
  }

  // Generate notablePatterns (keep for backward compat, but use patternsObserved if available)
  const notablePatterns = patternsObserved.length > 0 ? patternsObserved.slice(0, 4) : [];

  // Generate bestMatch (name matching layer)
  const contradictionCount = safeConflictingSignals.length;
  const confidenceDecimalForMatch = confidence / 100;
  
  // Determine match strength (NOT percentage)
  let matchStrength: "Very Strong" | "Strong" | "Moderate";
  if (confidenceDecimalForMatch >= 0.88 && contradictionCount === 0) {
    matchStrength = "Very Strong";
  } else if (confidenceDecimalForMatch >= 0.78 && contradictionCount <= 1) {
    matchStrength = "Strong";
  } else {
    matchStrength = "Moderate";
  }

  // Select best match name (lowest contradiction count approach)
  // Use existing strainName from wiki (already selected based on visual similarity)
  const bestMatchName = strainName;

  // Generate "why this match" bullets (3-5 bullets)
  const whyThisMatch: string[] = [];
  
  // Bud structure match
  if (wiki.morphology.budStructure) {
    whyThisMatch.push(`Bud structure (${wiki.morphology.budStructure.toLowerCase()}) aligns with documented ${strainName} characteristics`);
  }
  
  // Visual traits match
  if (safeVisualTraits.length > 0) {
    whyThisMatch.push(`Visual traits (${safeVisualTraits.slice(0, 2).join(", ")}) match typical ${strainName} morphology`);
  }
  
  // Effects alignment
  if (safePrimaryEffects.length > 0) {
    whyThisMatch.push(`Expected effects (${safePrimaryEffects.slice(0, 2).join(", ")}) align with ${strainName} profile`);
  }
  
  // Terpene profile
  if (topThreeTerpenes.length > 0) {
    whyThisMatch.push(`Terpene profile suggests ${topTerpene} dominance, consistent with ${strainName}`);
  }
  
  // Genetic dominance
  if (dominance !== "Unknown") {
    whyThisMatch.push(`${dominance} dominance matches ${strainName} genetic profile`);
  }
  
  // Ensure we have 3-5 bullets
  const finalWhyThisMatch = whyThisMatch.slice(0, 5);
  if (finalWhyThisMatch.length < 3) {
    // Fallback bullets if we don't have enough
    finalWhyThisMatch.push(`Coloration patterns align with ${strainName} characteristics`);
    if (finalWhyThisMatch.length < 3) {
      finalWhyThisMatch.push(`Growth indicators suggest ${strainName} phenotype`);
    }
  }

  // Phase 2.1: Compute match strength label (trust-building)
  const varianceSignals = safeConflictingSignals.length;
  const supportingTraitsCount = safeVisualTraits.length + (wiki.morphology.budStructure ? 1 : 0) + (wiki.morphology.trichomes ? 1 : 0);
  
  let matchStrengthLabel: "Very Strong" | "Strong" | "Moderate";
  if (confidenceDecimalForMatch >= 0.88 && varianceSignals === 0 && supportingTraitsCount >= 4) {
    matchStrengthLabel = "Very Strong";
  } else if (confidenceDecimalForMatch >= 0.78 && varianceSignals <= 1 && supportingTraitsCount >= 3) {
    matchStrengthLabel = "Strong";
  } else {
    matchStrengthLabel = "Moderate";
  }

  // Phase 2.1: Match rationale (why this cultivar was chosen)
  const matchRationale: string[] = [];
  if (wiki.morphology.budStructure) {
    matchRationale.push(`Flower structure (${wiki.morphology.budStructure.toLowerCase()}) matches documented ${strainName} morphology`);
  }
  if (safeVisualTraits.length > 0) {
    matchRationale.push(`Observed visual traits (${safeVisualTraits.slice(0, 2).join(", ")}) align with ${strainName} characteristics`);
  }
  if (wiki.morphology.trichomes) {
    matchRationale.push(`Trichome coverage and type (${wiki.morphology.trichomes.toLowerCase()}) consistent with ${strainName} profiles`);
  }
  if (dominance !== "Unknown") {
    matchRationale.push(`${dominance} genetic dominance matches ${strainName} lineage`);
  }
  if (safePrimaryEffects.length > 0) {
    matchRationale.push(`Expected effect profile aligns with ${strainName} user reports`);
  }

  // Phase 2.1: Detailed morphology breakdown
  const budStructureDesc = wiki.morphology.budStructure || "Flower structure shows typical hybrid characteristics";
  const trichomeDesc = wiki.morphology.trichomes || "Trichome coverage appears typical for mature flowers";
  const pistilDesc = wiki.morphology.coloration.includes("pistil") 
    ? wiki.morphology.coloration 
    : `Pistil color and maturity appear consistent with ${strainName} characteristics`;
  const colorNotes = wiki.morphology.coloration || `Coloration patterns align with ${strainName} visual profiles`;

  // Phase 2.1: Terpene & aroma inference (clearly labeled)
  const likelyPrimary = topThreeTerpenes.slice(0, 2);
  const supportingTerpenes = topThreeTerpenes.slice(2);
  const aromaDescriptors: string[] = [];
  if (topTerpene === "Myrcene") {
    aromaDescriptors.push("earthy", "musky", "herbal");
  } else if (topTerpene === "Limonene") {
    aromaDescriptors.push("citrus", "lemon", "bright");
  } else if (topTerpene === "Caryophyllene") {
    aromaDescriptors.push("peppery", "spicy", "woody");
  } else if (topTerpene === "Pinene") {
    aromaDescriptors.push("pine", "fresh", "resinous");
  } else if (topTerpene === "Linalool") {
    aromaDescriptors.push("floral", "lavender", "sweet");
  } else {
    aromaDescriptors.push("complex", "layered", "terpene-rich");
  }

  const inferenceReasoning = `Terpene inference is based on visual characteristics, trichome appearance, and typical profiles for ${strainName}. ` +
    `Aroma descriptors (${aromaDescriptors.join(", ")}) are inferred from likely terpene presence, not direct olfactory analysis. ` +
    `Actual terpene content can only be confirmed through laboratory testing.`;

  // Phase 2.1: Effect profile (structured, not listy)
  const onsetDescription = wiki.experience.onset === "Quick" 
    ? "Effects typically develop rapidly, often within 5-15 minutes of consumption"
    : wiki.experience.onset === "Gradual"
    ? "Effects develop gradually over 20-45 minutes, building to peak intensity"
    : "Effects develop at a moderate pace, reaching peak intensity within 15-30 minutes";

  const secondaryEffects = wiki.experience.secondaryEffects || wiki.experience.effects.slice(2, 4) || [];
  const durationEstimate = wiki.experience.duration || "2-4 hours typical duration";
  
  const functionalNotes = dominance === "Indica" 
    ? "This profile suggests body-focused effects that may be better suited for evening use or relaxation contexts"
    : dominance === "Sativa"
    ? "This profile suggests energizing, cerebral effects that may be better suited for daytime use or creative activities"
    : "This hybrid profile balances both mental and physical effects, with the specific balance varying by phenotype and individual response";

  // Phase 2.1: Cultivar context
  const typicalGrowthType = dominance === "Indica"
    ? "Compact, bushy growth pattern typical of indica-dominant cultivars"
    : dominance === "Sativa"
    ? "Taller, more elongated growth pattern typical of sativa-dominant cultivars"
    : "Balanced growth pattern showing characteristics of both indica and sativa lineages";

  const indoorOutdoorNotes = dominance === "Indica"
    ? "Well-suited for indoor cultivation due to compact structure; also performs well outdoors in temperate climates"
    : dominance === "Sativa"
    ? "Requires more vertical space; performs excellently outdoors in warm climates with long growing seasons"
    : "Adaptable to both indoor and outdoor cultivation, with structure varying by phenotype expression";

  const harvestTimingClues = wiki.morphology.trichomes.includes("high density") || wiki.morphology.trichomes.includes("heavy")
    ? "High trichome density suggests approaching or at optimal harvest window"
    : wiki.morphology.trichomes.includes("mature") || wiki.morphology.trichomes.includes("capitate")
    ? "Trichome maturity indicators suggest flowers are within harvest window"
    : "Trichome development appears consistent with mid-to-late flowering stage";

  // Phase 2.1: Limitations section
  const uncertaintyFactors: string[] = [];
  if (hasUncertainty) {
    uncertaintyFactors.push(`Conflicting visual signals: ${safeConflictingSignals.join(", ")}`);
  }
  if (confidence < 80) {
    uncertaintyFactors.push("Visual characteristics show some variance from typical profiles");
  }
  if (wiki.identity.alternateMatches && wiki.identity.alternateMatches.length > 0) {
    uncertaintyFactors.push(`Similar visual characteristics to ${wiki.identity.alternateMatches[0].strainName} suggest potential misidentification`);
  }
  uncertaintyFactors.push("Environmental factors (lighting, nutrients, growing techniques) can significantly alter visual appearance");
  uncertaintyFactors.push("Phenotype variation within the same genetic line can produce different visual characteristics");

  const whyExactIDIsHard = `Exact cultivar identification from visual analysis alone is challenging because many cannabis varieties share similar morphological traits. ` +
    `Cultivars within the same genetic family (such as ${lineage}) often exhibit overlapping visual characteristics, making distinction difficult without genetic testing. ` +
    `Additionally, environmental factors, harvest timing, and phenotype expression can cause the same cultivar to appear quite different across different growing conditions. ` +
    `For definitive identification, DNA analysis or comprehensive laboratory testing provides the most accurate results.`;

  return {
    summary,
    whyThisMatters,
    uncertaintyExplanation,
    signalsConsidered: signalsConsidered.length > 0 ? signalsConsidered : undefined,
    patternsObserved: patternsObserved.length > 0 ? patternsObserved : undefined,
    notablePatterns,
    bestMatch: {
      name: bestMatchName,
      matchStrength,
      whyThisMatch: finalWhyThisMatch,
    },
    // Phase 2.1: Extensive free-tier results
    identity: {
      closestCultivarName: strainName,
      matchStrengthLabel,
      matchRationale,
    },
    morphologyAnalysis: {
      flowerStructure: budStructureDesc,
      trichomeCoverage: trichomeDesc,
      pistilCharacteristics: pistilDesc,
      colorationNotes: colorNotes,
    },
    terpeneInference: {
      likelyPrimary,
      supportingTerpenes,
      aromaDescriptors,
      inferenceReasoning,
    },
    effectProfile: {
      onsetDescription,
      primaryEffects: safePrimaryEffects,
      secondaryEffects: secondaryEffects.length > 0 ? secondaryEffects : [],
      durationEstimate,
      functionalNotes,
    },
    cultivationContext: {
      typicalGrowthType,
      indoorOutdoorNotes,
      harvestTimingClues,
    },
    limitations: {
      uncertaintyFactors,
      whyExactIDIsHard,
    },
  };
}
