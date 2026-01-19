// lib/scanner/identificationReport.ts
// 🔒 Phase 2.1 RESET — Strict IdentificationReport generator

import type { WikiResult, ScanContext, IdentificationReport } from "./types";
import { matchCultivars, type CultivarMatch } from "./cultivarMatcher";

/**
 * Generate strict IdentificationReport from WikiResult
 * NAME is the primary output - authoritative naming with ranked alternatives
 */
export function generateIdentificationReport(
  wiki: WikiResult,
  context: ScanContext
): IdentificationReport {
  // Get ranked cultivar matches
  const matches = matchCultivars(wiki, context);
  console.log("Ranked cultivar matches:", matches);

  // Select primary match (top match if score >= 30, otherwise fallback)
  const topMatch = matches.length > 0 && matches[0].score >= 30 ? matches[0] : null;
  
  const primaryName = topMatch
    ? topMatch.name
    : "Phenotype-Closest Hybrid";

  const primaryConfidenceRange = topMatch
    ? topMatch.confidenceRange
    : "30-45%";

  const whyItWon = topMatch
    ? topMatch.reasons
    : [
        "Visual characteristics suggest a hybrid phenotype",
        "No single named cultivar showed dominant alignment",
        "Multiple cultivars share similar morphological traits",
      ];

  // Ranked alternates (at least 2, exclude primary if it's in the list)
  const alternateMatches = matches
    .filter(m => m.name !== primaryName)
    .slice(0, 4) // Top 4 alternates
    .map(m => ({
      name: m.name,
      confidenceRange: m.confidenceRange,
      reasons: m.reasons,
    }));

  // Ensure at least 2 alternates (if we have matches)
  if (alternateMatches.length < 2 && matches.length >= 2) {
    // Include the second match even if it's the primary (for fallback cases)
    const secondMatch = matches[1];
    if (secondMatch && !alternateMatches.some(a => a.name === secondMatch.name)) {
      alternateMatches.push({
        name: secondMatch.name,
        confidenceRange: secondMatch.confidenceRange,
        reasons: secondMatch.reasons,
      });
    }
  }

  // Visual evidence
  const matchingTraits: string[] = [];
  if (topMatch) {
    // Extract which traits matched from the reasons
    if (topMatch.reasons.some(r => r.includes("Bud structure"))) {
      matchingTraits.push("Bud structure");
    }
    if (topMatch.reasons.some(r => r.includes("Trichome"))) {
      matchingTraits.push("Trichome density");
    }
    if (topMatch.reasons.some(r => r.includes("Effect profile"))) {
      matchingTraits.push("Effect profile");
    }
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
