// lib/scanner/identificationReport.ts
// 🔒 Phase 2.1 RESET — Strict IdentificationReport generator

import type { WikiResult, ScanContext, IdentificationReport } from "./types";
import { matchCultivars } from "./cultivarMatcher";

/**
 * Generate strict IdentificationReport from WikiResult
 * NAME is the primary output - authoritative naming with ranked alternatives
 */
export function generateIdentificationReport(
  wiki: WikiResult,
  context: ScanContext
): IdentificationReport {
  // Get ranked cultivar matches
  const matchResult = matchCultivars(wiki, context);
  console.log("Ranked cultivar matches:", matchResult);

  // Select primary match
  const primary = matchResult.primary;
  const primaryName = primary.name;
  const primaryConfidenceRange = primary.confidenceRange;
  const whyItWon = primary.reasons;

  // Ranked alternates (at least 2)
  const alternateMatches = matchResult.alternates.slice(0, 4).map(m => ({
    name: m.name,
    confidenceRange: m.confidenceRange,
    reasons: [m.reason],
  }));

  // Visual evidence
  const matchingTraits: string[] = [];
  // Extract which traits matched from the reasons
  if (primary.reasons.some(r => r.includes("Bud") || r.includes("bud"))) {
    matchingTraits.push("Bud structure");
  }
  if (primary.reasons.some(r => r.includes("Trichome") || r.includes("trichome"))) {
    matchingTraits.push("Trichome density");
  }
  if (primary.reasons.some(r => r.includes("Effect") || r.includes("effect"))) {
    matchingTraits.push("Effect profile");
  }

  // Extract pistil color from coloration
  const pistilColor = wiki.morphology.coloration.includes("pistil")
    ? wiki.morphology.coloration
    : wiki.morphology.coloration.includes("orange")
    ? "Orange"
    : wiki.morphology.coloration.includes("amber")
    ? "Amber"
    : wiki.morphology.coloration.includes("white")
    ? "White"
    : "Mixed";

  // Extract leaf shape from context if available
  const leafShape = context.detectedFeatures?.leafShape || undefined;

  // Limitations
  const hasUncertainty = wiki.reasoning?.conflictingSignals && wiki.reasoning.conflictingSignals.length > 0;
  const uncertaintyFactors: string[] = [];
  
  if (hasUncertainty && wiki.reasoning?.conflictingSignals) {
    uncertaintyFactors.push(...wiki.reasoning.conflictingSignals.map(s => `Conflicting signal: ${s}`));
  }
  
  if (wiki.identity.confidence < 75) {
    uncertaintyFactors.push("Visual characteristics show some variance from typical profiles");
  }
  
  if (wiki.identity.alternateMatches && wiki.identity.alternateMatches.length > 0) {
    uncertaintyFactors.push(`Similar visual characteristics to ${wiki.identity.alternateMatches[0].strainName}`);
  }
  
  uncertaintyFactors.push("Environmental factors (lighting, nutrients, growing techniques) can significantly alter visual appearance");
  uncertaintyFactors.push("Phenotype variation within the same genetic line can produce different visual characteristics");

  const whyExactIDIsHard = `Exact cultivar identification from visual analysis alone is challenging because many cannabis varieties share similar morphological traits. ` +
    `Cultivars within the same genetic family often exhibit overlapping visual characteristics, making distinction difficult without genetic testing. ` +
    `Additionally, environmental factors, harvest timing, and phenotype expression can cause the same cultivar to appear quite different across different growing conditions. ` +
    `For definitive identification, DNA analysis or comprehensive laboratory testing provides the most accurate results.`;

  const disclaimer = "This identification is based on visual similarity to reference materials and should not be considered a genetic confirmation. Laboratory testing provides definitive identification.";

  return {
    primaryMatch: {
      name: primaryName,
      confidenceRange: primaryConfidenceRange,
      whyItWon,
    },
    alternateMatches,
    visualEvidence: {
      budStructure: wiki.morphology.budStructure,
      trichomeDensity: wiki.morphology.trichomes,
      pistilColor,
      coloration: wiki.morphology.coloration,
      leafShape,
      matchingTraits,
    },
    knownProfile: {
      genetics: {
        dominance: wiki.genetics.dominance,
        lineage: wiki.genetics.lineage,
      },
      effects: {
        primary: wiki.experience.primaryEffects || wiki.experience.effects.slice(0, 3),
        secondary: wiki.experience.secondaryEffects || wiki.experience.effects.slice(3, 6) || [],
      },
      terpenes: {
        likely: wiki.chemistry.terpenes.slice(0, 3).map(t => t.name),
        inferred: wiki.chemistry.likelyTerpenes?.map(t => t.name) || [],
      },
    },
    limitations: {
      uncertaintyFactors,
      whyExactIDIsHard,
      disclaimer,
    },
  };
}
