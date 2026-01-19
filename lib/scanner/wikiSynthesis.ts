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

  // Generate summary (2-3 paragraphs)
  const summary: string[] = [
    `Based on observed morphology from ${reasoningText ? "the analysis" : "visual characteristics"}, ` +
    `this cultivar aligns with ${strainName}. Genetic analysis indicates ${dominance} dominance with lineage tracing to ${lineage}. ` +
    `Terpene likelihoods suggest ${topTerpene} as a primary compound, with ${safeTopThreeTerpenes.slice(1).join(" and ")} also present in the profile.`,
    
    `Effects typically include ${safePrimaryEffects.join(", ").toLowerCase()}, which aligns with the ${dominance.toLowerCase()} genetic profile. ` +
    `The morphology data shows ${wiki.morphology.budStructure.toLowerCase()}, with ${wiki.morphology.coloration.toLowerCase()}. ` +
    `Trichome characteristics (${wiki.morphology.trichomes.toLowerCase()}) suggest appropriate maturity for analysis.`,
    
    confidence < 80
      ? `Confidence in this identification is estimated at ${confidence}%, reflecting visual similarity to documented specimens. ` +
        `Phenotypic variation and environmental factors may cause deviations from typical profiles. This analysis is not laboratory-verified.`
      : `Visual characteristics show strong alignment with documented genetic profiles for this cultivar. ` +
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
  const hasLowConfidence = confidence < 65;
  const hasManyContradictions = contradictionCount >= 2;
  
  // Determine confidence label (NOT percentage)
  let confidenceLabel: "High" | "Moderate" | "Low";
  if (hasLowConfidence || hasManyContradictions) {
    confidenceLabel = "Low";
  } else if (confidence >= 80 && contradictionCount === 0) {
    confidenceLabel = "High";
  } else {
    confidenceLabel = "Moderate";
  }

  // Select best match name (lowest contradiction count approach)
  // Use existing strainName from wiki, but apply fallback for Low confidence
  let bestMatchName: string;
  if (confidenceLabel === "Low") {
    bestMatchName = "General Hybrid Profile";
  } else {
    // Use the primary strain name from wiki (already selected based on visual similarity)
    bestMatchName = strainName;
  }

  // Generate explanation (one sentence max)
  const explanation = confidenceLabel === "Low"
    ? "Visual characteristics suggest a general hybrid profile rather than a specific cultivar match."
    : `This plant most closely resembles known examples of ${bestMatchName} based on bud structure, leaf form, and observed effect patterns.`;

  return {
    summary,
    whyThisMatters,
    uncertaintyExplanation,
    signalsConsidered: signalsConsidered.length > 0 ? signalsConsidered : undefined,
    patternsObserved: patternsObserved.length > 0 ? patternsObserved : undefined,
    notablePatterns,
    bestMatch: {
      name: bestMatchName,
      confidenceLabel,
      explanation,
    },
  };
}
