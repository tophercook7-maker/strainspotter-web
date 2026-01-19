// lib/scanner/cultivarMatcher.ts
// 🔒 Phase 2.2 — Cultivar Name Matching & Ranking Engine

import type { WikiResult, ScanContext } from "./types";

export type CultivarMatch = {
  name: string;
  score: number; // 0-100 internal only
  rationale: string[];
};

// Known cultivar reference list with characteristics
type CultivarReference = {
  name: string;
  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid";
    lineage: string[];
  };
  typicalTerpenes: string[];
  typicalEffects: string[];
  typicalMorphology: {
    budStructure?: string;
    coloration?: string;
    trichomeDensity?: string;
  };
};

const CULTIVAR_REFERENCES: CultivarReference[] = [
  {
    name: "Northern Lights",
    genetics: { dominance: "Indica", lineage: ["Afghan", "Thai"] },
    typicalTerpenes: ["Myrcene", "Caryophyllene", "Pinene"],
    typicalEffects: ["Relaxed", "Happy", "Sleepy", "Euphoric"],
    typicalMorphology: {
      budStructure: "Dense, compact flowers",
      coloration: "Deep green with purple hues",
      trichomeDensity: "Heavy trichome coverage",
    },
  },
  {
    name: "Blue Dream",
    genetics: { dominance: "Hybrid", lineage: ["Blueberry", "Haze"] },
    typicalTerpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    typicalEffects: ["Happy", "Relaxed", "Creative", "Uplifted"],
    typicalMorphology: {
      budStructure: "Dense, conical flowers",
      coloration: "Forest green with blue tints",
      trichomeDensity: "High density",
    },
  },
  {
    name: "OG Kush",
    genetics: { dominance: "Hybrid", lineage: ["Hindu Kush", "Chemdawg"] },
    typicalTerpenes: ["Myrcene", "Limonene", "Caryophyllene"],
    typicalEffects: ["Relaxed", "Happy", "Euphoric", "Hungry"],
    typicalMorphology: {
      budStructure: "Dense, resinous flowers",
      coloration: "Deep green with orange pistils",
      trichomeDensity: "Very high density",
    },
  },
  {
    name: "Girl Scout Cookies",
    genetics: { dominance: "Hybrid", lineage: ["OG Kush", "Durban Poison"] },
    typicalTerpenes: ["Caryophyllene", "Limonene", "Myrcene"],
    typicalEffects: ["Happy", "Relaxed", "Creative", "Euphoric"],
    typicalMorphology: {
      budStructure: "Dense, chunky flowers",
      coloration: "Dark green with purple",
      trichomeDensity: "Extremely high density",
    },
  },
  {
    name: "White Widow",
    genetics: { dominance: "Hybrid", lineage: ["Brazilian", "South Indian"] },
    typicalTerpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    typicalEffects: ["Happy", "Energetic", "Creative", "Uplifted"],
    typicalMorphology: {
      budStructure: "Dense, compact flowers",
      coloration: "Light green with white trichomes",
      trichomeDensity: "Extremely high density",
    },
  },
  {
    name: "Sour Diesel",
    genetics: { dominance: "Sativa", lineage: ["Chemdawg", "Super Skunk"] },
    typicalTerpenes: ["Limonene", "Myrcene", "Caryophyllene"],
    typicalEffects: ["Energetic", "Happy", "Uplifted", "Creative"],
    typicalMorphology: {
      budStructure: "Elongated, foxtailed flowers",
      coloration: "Bright green with orange pistils",
      trichomeDensity: "Moderate to high density",
    },
  },
  {
    name: "Granddaddy Purple",
    genetics: { dominance: "Indica", lineage: ["Purple Urkle", "Big Bud"] },
    typicalTerpenes: ["Myrcene", "Caryophyllene", "Pinene"],
    typicalEffects: ["Relaxed", "Sleepy", "Happy", "Hungry"],
    typicalMorphology: {
      budStructure: "Dense, compact flowers",
      coloration: "Deep purple with green",
      trichomeDensity: "High density",
    },
  },
  {
    name: "Pineapple Express",
    genetics: { dominance: "Hybrid", lineage: ["Trainwreck", "Hawaiian"] },
    typicalTerpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    typicalEffects: ["Happy", "Energetic", "Uplifted", "Creative"],
    typicalMorphology: {
      budStructure: "Dense, conical flowers",
      coloration: "Bright green with orange pistils",
      trichomeDensity: "High density",
    },
  },
  {
    name: "Jack Herer",
    genetics: { dominance: "Sativa", lineage: ["Northern Lights", "Haze", "Skunk"] },
    typicalTerpenes: ["Pinene", "Myrcene", "Caryophyllene"],
    typicalEffects: ["Energetic", "Happy", "Creative", "Uplifted"],
    typicalMorphology: {
      budStructure: "Elongated, foxtailed flowers",
      coloration: "Light green with orange pistils",
      trichomeDensity: "Moderate to high density",
    },
  },
  {
    name: "Purple Haze",
    genetics: { dominance: "Sativa", lineage: ["Purple Thai", "Haze"] },
    typicalTerpenes: ["Myrcene", "Pinene", "Limonene"],
    typicalEffects: ["Energetic", "Happy", "Creative", "Euphoric"],
    typicalMorphology: {
      budStructure: "Elongated, airy flowers",
      coloration: "Purple and green",
      trichomeDensity: "Moderate density",
    },
  },
  {
    name: "AK-47",
    genetics: { dominance: "Hybrid", lineage: ["Colombian", "Mexican", "Thai", "Afghan"] },
    typicalTerpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    typicalEffects: ["Happy", "Relaxed", "Euphoric", "Uplifted"],
    typicalMorphology: {
      budStructure: "Dense, compact flowers",
      coloration: "Green with orange pistils",
      trichomeDensity: "High density",
    },
  },
  {
    name: "Afghan Kush",
    genetics: { dominance: "Indica", lineage: ["Afghan"] },
    typicalTerpenes: ["Myrcene", "Caryophyllene", "Pinene"],
    typicalEffects: ["Relaxed", "Sleepy", "Happy", "Hungry"],
    typicalMorphology: {
      budStructure: "Dense, compact flowers",
      coloration: "Dark green with purple",
      trichomeDensity: "Very high density",
    },
  },
];

/**
 * Match cultivars based on WikiResult and ScanContext
 * Returns top 5 matches sorted by score (highest first)
 */
export function matchCultivars(
  wiki: WikiResult,
  context?: ScanContext
): CultivarMatch[] {
  const matches: CultivarMatch[] = [];

  // Extract data from wiki
  const wikiDominance = wiki.genetics.dominance;
  const wikiTerpenes = wiki.chemistry.terpenes.map((t) => t.name);
  const wikiEffects = wiki.experience.effects;
  const wikiBudStructure = wiki.morphology.budStructure.toLowerCase();
  const wikiColoration = wiki.morphology.coloration.toLowerCase();
  const wikiTrichomes = wiki.morphology.trichomes.toLowerCase();
  const hasUncertainty = context?.uncertaintySignals?.conflictingTraits && context.uncertaintySignals.conflictingTraits.length > 0;
  const uncertaintyPenalty = hasUncertainty ? 10 : 0;

  // Score each cultivar
  for (const cultivar of CULTIVAR_REFERENCES) {
    let score = 0;
    const rationale: string[] = [];

    // Genetics match (0-30 points)
    if (wikiDominance === "Unknown") {
      // No penalty, but no bonus either for unknown
      score += 0;
    } else if (cultivar.genetics.dominance === wikiDominance) {
      score += 30;
      rationale.push(`${cultivar.genetics.dominance} dominance matches`);
    } else if (wikiDominance === "Hybrid" || cultivar.genetics.dominance === "Hybrid") {
      score += 15;
      rationale.push(`Hybrid alignment (${cultivar.genetics.dominance} vs ${wikiDominance})`);
    }

    // Terpene overlap (0-25 points)
    const terpeneMatches = wikiTerpenes.filter((t) =>
      cultivar.typicalTerpenes.includes(t)
    ).length;
    if (terpeneMatches > 0) {
      const terpeneScore = Math.min(25, terpeneMatches * 8);
      score += terpeneScore;
      rationale.push(`${terpeneMatches} terpene match${terpeneMatches > 1 ? "es" : ""} (${wikiTerpenes.filter((t) => cultivar.typicalTerpenes.includes(t)).join(", ")})`);
    }

    // Effect profile similarity (0-25 points)
    const effectMatches = wikiEffects.filter((e) =>
      cultivar.typicalEffects.some(
        (ce) => ce.toLowerCase() === e.toLowerCase() || ce.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(ce.toLowerCase())
      )
    ).length;
    if (effectMatches > 0) {
      const effectScore = Math.min(25, effectMatches * 6);
      score += effectScore;
      rationale.push(`${effectMatches} effect match${effectMatches > 1 ? "es" : ""}`);
    }

    // Morphology alignment (0-20 points)
    let morphologyScore = 0;
    if (cultivar.typicalMorphology.budStructure) {
      const structureMatch = wikiBudStructure.includes(
        cultivar.typicalMorphology.budStructure.toLowerCase().split(" ")[0]
      ) || cultivar.typicalMorphology.budStructure.toLowerCase().includes(wikiBudStructure.split(" ")[0]);
      if (structureMatch) {
        morphologyScore += 7;
        rationale.push("Bud structure alignment");
      }
    }
    if (cultivar.typicalMorphology.coloration) {
      const colorMatch = wikiColoration.includes(
        cultivar.typicalMorphology.coloration.toLowerCase().split(" ")[0]
      ) || cultivar.typicalMorphology.coloration.toLowerCase().includes(wikiColoration.split(" ")[0]);
      if (colorMatch) {
        morphologyScore += 7;
        rationale.push("Coloration alignment");
      }
    }
    if (cultivar.typicalMorphology.trichomeDensity) {
      const trichomeMatch = wikiTrichomes.includes(
        cultivar.typicalMorphology.trichomeDensity.toLowerCase().split(" ")[0]
      ) || cultivar.typicalMorphology.trichomeDensity.toLowerCase().includes(wikiTrichomes.split(" ")[0]);
      if (trichomeMatch) {
        morphologyScore += 6;
        rationale.push("Trichome density alignment");
      }
    }
    score += morphologyScore;

    // Apply uncertainty penalty
    score = Math.max(0, score - uncertaintyPenalty);

    // Only include matches with rationale
    if (rationale.length > 0) {
      matches.push({
        name: cultivar.name,
        score: Math.min(100, Math.round(score)),
        rationale,
      });
    }
  }

  // Sort by score (highest first) and return top 5
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}
