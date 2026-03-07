// lib/scanner/extendedProfile.ts
// Phase 2.9 Part P — Extensive Strain Profile (Wiki-Depth Output)

import type { WikiResult } from "./types";
import type { FusedFeatures } from "./multiImageFusion";
import type { CultivarReference } from "./cultivarLibrary";
import type { WikiData } from "./wikiLookup";

// Phase 2.9 Part P Step 1 — Profile Sections (Lock)
export type ExtendedStrainProfile = {
  name: string;
  aliases: string[];
  genetics: {
    lineage: string;
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    breederNotes: string[];
  };
  morphology: {
    budStructure: string;
    coloration: string;
    trichomeDensity: string;
    leafTraits: string;
  };
  terpeneProfile: {
    primary: string[];
    secondary: string[];
    aromaDescription: string;
  };
  cannabinoidProfile: {
    thcRange: string;
    cbdRange: string;
    minorCannabinoids: string[];
  };
  effects: {
    onset: string;
    primary: string[];
    secondary: string[];
    duration: string;
  };
  commonUseCases: string[];
  cultivationNotes: {
    indoorOutdoor: string;
    floweringTime: string;
    yieldEstimate: string;
  };
  knownVariations: string[];
  disclaimers: string[];
};

/**
 * Generate extended strain profile
 * Phase 2.9 Part P Step 2 — Data Sources
 */
export function generateExtendedProfile(
  strainName: string,
  wikiResult: WikiResult,
  dbEntry: CultivarReference | undefined,
  wikiData: WikiData | null,
  fusedFeatures: FusedFeatures,
  imageCount: number,
  varianceSeed: number // Phase 2.9 Part P Step 5 — Variance Check
): ExtendedStrainProfile {
  // Phase 2.9 Part P Step 3 — Readability Rules
  // No paragraph longer than 3 lines, prefer bullets, descriptive language

  // Name & Aliases
  const aliases = dbEntry?.aliases || [];
  if (!aliases.includes(strainName)) {
    aliases.unshift(strainName);
  }

  // Genetics
  const lineage = wikiData?.genetics || dbEntry?.genetics || wikiResult.genetics.lineage.join(" × ");
  const dominance = dbEntry?.type || dbEntry?.dominantType || wikiResult.genetics.dominance;
  
  const breederNotes: string[] = [];
  if (wikiData?.summary) {
    breederNotes.push(wikiData.summary);
  }
  if (wikiResult.genetics.breederNotes) {
    breederNotes.push(wikiResult.genetics.breederNotes);
  }
  if (dbEntry?.wikiSummary) {
    breederNotes.push(dbEntry.wikiSummary);
  }
  if (breederNotes.length === 0) {
    breederNotes.push(`${strainName} is a ${dominance.toLowerCase()}-dominant cultivar known for its distinctive characteristics.`);
  }

  // Morphology (Phase 2.9 Part P Step 3 — Descriptive, short)
  const budStructure = wikiResult.morphology.budStructure || 
    (fusedFeatures.budStructure === "high" 
      ? "Dense, compact flowers with tight calyx formation"
      : fusedFeatures.budStructure === "medium"
      ? "Moderately dense flowers with balanced structure"
      : "Elongated, airy flowers with loose structure");
  
  const coloration = wikiResult.morphology.coloration || 
    dbEntry?.visualProfile?.colorProfile ||
    "Deep green hues with vibrant pistil coloration";
  
  const trichomeDensity = wikiResult.morphology.trichomes ||
    (fusedFeatures.trichomeDensity === "high"
      ? "Heavy trichome coverage with abundant resin production"
      : fusedFeatures.trichomeDensity === "medium"
      ? "Moderate trichome coverage with visible resin glands"
      : "Light trichome coverage indicating earlier growth stage");
  
  const leafTraits = fusedFeatures.leafShape === "broad"
    ? "Broad, wide leaves with short internode spacing typical of indica genetics"
    : "Narrow, elongated leaves with longer internode spacing characteristic of sativa genetics";

  // Terpene Profile
  const primaryTerpenes = dbEntry?.terpeneProfile || dbEntry?.commonTerpenes || [];
  const secondaryTerpenes = wikiResult.chemistry.terpenes
    .filter(t => !primaryTerpenes.includes(t.name))
    .slice(0, 3)
    .map(t => t.name);
  
  const aromaDescriptors: string[] = [];
  if (primaryTerpenes.includes("myrcene")) aromaDescriptors.push("earthy", "musky");
  if (primaryTerpenes.includes("limonene")) aromaDescriptors.push("citrus", "lemon");
  if (primaryTerpenes.includes("pinene")) aromaDescriptors.push("pine", "fresh");
  if (primaryTerpenes.includes("caryophyllene")) aromaDescriptors.push("pepper", "spice");
  if (primaryTerpenes.includes("linalool")) aromaDescriptors.push("lavender", "floral");
  
  const aromaDescription = aromaDescriptors.length > 0
    ? `${strainName} typically exhibits ${aromaDescriptors.slice(0, 3).join(", ")} aromas, with notes of ${aromaDescriptors.slice(3, 5).join(" and ")} when present.`
    : "Aroma profile varies by phenotype and growing conditions.";

  // Cannabinoid Profile (Phase 2.9 Part P Step 3 — Descriptive ranges)
  const thcRange = wikiResult.chemistry.cannabinoids.THC || 
    (dominance === "Indica" ? "18-25%" : dominance === "Sativa" ? "20-28%" : "18-26%");
  const cbdRange = wikiResult.chemistry.cannabinoids.CBD || "0-2%";
  const minorCannabinoids: string[] = [];
  if (varianceSeed % 3 === 0) minorCannabinoids.push("CBG");
  if (varianceSeed % 4 === 0) minorCannabinoids.push("CBN");
  if (minorCannabinoids.length === 0) minorCannabinoids.push("Trace amounts of minor cannabinoids");

  // Effects (Phase 2.9 Part P Step 3 — Clear, descriptive)
  const primaryEffects = wikiResult.experience.primaryEffects || 
    wikiResult.experience.effects.slice(0, 3) ||
    dbEntry?.effects.slice(0, 3) || [];
  const secondaryEffects = wikiResult.experience.secondaryEffects || 
    wikiResult.experience.effects.slice(3, 6) ||
    dbEntry?.effects.slice(3, 6) || [];
  
  const onset = wikiResult.experience.onset || 
    (dominance === "Indica" ? "Quick onset, typically within 10-15 minutes" : "Gradual onset, developing over 15-20 minutes");
  const duration = wikiResult.experience.duration ||
    (dominance === "Indica" ? "2-4 hours" : "3-5 hours");

  // Common Use Cases
  const commonUseCases: string[] = [];
  if (dominance === "Indica") {
    commonUseCases.push("Evening relaxation", "Sleep support", "Stress relief");
  } else if (dominance === "Sativa") {
    commonUseCases.push("Daytime focus", "Creative activities", "Social settings");
  } else {
    commonUseCases.push("Balanced day/evening use", "Moderate relaxation", "General wellness");
  }

  // Cultivation Notes
  const indoorOutdoor = dominance === "Indica"
    ? "Suitable for both indoor and outdoor cultivation, prefers controlled indoor environments"
    : dominance === "Sativa"
    ? "Thrives in warm, sunny climates; can be challenging indoors due to height"
    : "Adaptable to various growing conditions, responds well to training techniques";
  
  const floweringTime = dominance === "Indica"
    ? "8-9 weeks"
    : dominance === "Sativa"
    ? "10-14 weeks"
    : "9-11 weeks";
  
  const yieldEstimate = fusedFeatures.budStructure === "high"
    ? "High yield potential with dense bud production"
    : fusedFeatures.budStructure === "medium"
    ? "Moderate to high yield with proper care"
    : "Moderate yield with airier flower structure";

  // Known Variations (Phase 2.9 Part P Step 5 — Variance)
  const knownVariations: string[] = [];
  const variationPhrases = [
    "Phenotype variations may show slight differences in color and structure",
    "Different phenotypes can exhibit varying terpene profiles",
    "Growing conditions significantly influence final appearance",
    "Harvest timing affects trichome maturity and coloration",
  ];
  knownVariations.push(variationPhrases[varianceSeed % variationPhrases.length]);
  if (varianceSeed % 2 === 0) {
    knownVariations.push("Some phenotypes display more pronounced indica or sativa characteristics");
  }

  // Disclaimers
  const disclaimers: string[] = [
    "Visual identification is based on morphological analysis and may not match genetic testing",
    "Cannabinoid and terpene profiles can vary significantly between phenotypes",
    "Effects are commonly reported and may vary by individual",
    "Cultivation results depend on growing conditions, techniques, and environmental factors",
  ];

  return {
    name: strainName,
    aliases: [...new Set(aliases)], // Remove duplicates
    genetics: {
      lineage,
      dominance,
      breederNotes: breederNotes.slice(0, 3), // Max 3 notes
    },
    morphology: {
      budStructure,
      coloration,
      trichomeDensity,
      leafTraits,
    },
    terpeneProfile: {
      primary: primaryTerpenes.slice(0, 3),
      secondary: secondaryTerpenes.slice(0, 3),
      aromaDescription,
    },
    cannabinoidProfile: {
      thcRange,
      cbdRange,
      minorCannabinoids: minorCannabinoids.slice(0, 3),
    },
    effects: {
      onset,
      primary: primaryEffects.slice(0, 5),
      secondary: secondaryEffects.slice(0, 4),
      duration,
    },
    commonUseCases: commonUseCases.slice(0, 5),
    cultivationNotes: {
      indoorOutdoor,
      floweringTime,
      yieldEstimate,
    },
    knownVariations: knownVariations.slice(0, 3),
    disclaimers: disclaimers.slice(0, 4),
  };
}
