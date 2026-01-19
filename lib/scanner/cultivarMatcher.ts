// lib/scanner/cultivarMatcher.ts
// 🔒 Phase 2.2 — Cultivar Name Matching & Ranking Engine

import type { WikiResult, ScanContext } from "./types";
import { CULTIVAR_LIBRARY } from "./cultivarReference";

export type CultivarMatch = {
  name: string;
  score: number; // 0-100 internal only
  rationale: string[];
};

/**
 * Extract dominance from genetics string
 */
function extractDominance(genetics: string): "Indica" | "Sativa" | "Hybrid" | "Unknown" {
  const lower = genetics.toLowerCase();
  if (lower.includes("indica") && !lower.includes("sativa")) {
    return "Indica";
  } else if (lower.includes("sativa") && !lower.includes("indica")) {
    return "Sativa";
  } else if (lower.includes("hybrid") || (lower.includes("indica") && lower.includes("sativa"))) {
    return "Hybrid";
  }
  return "Unknown";
}

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
  for (const cultivar of CULTIVAR_LIBRARY) {
    let score = 0;
    const rationale: string[] = [];

    // Extract dominance from genetics string
    const cultivarDominance = extractDominance(cultivar.genetics);

    // Genetics match (0-30 points)
    if (wikiDominance === "Unknown") {
      // No penalty, but no bonus either for unknown
      score += 0;
    } else if (cultivarDominance === wikiDominance) {
      score += 30;
      rationale.push(`${cultivarDominance} dominance matches`);
    } else if (wikiDominance === "Hybrid" || cultivarDominance === "Hybrid") {
      score += 15;
      rationale.push(`Hybrid alignment (${cultivarDominance} vs ${wikiDominance})`);
    }

    // Terpene overlap (0-25 points)
    const wikiTerpenesLower = wikiTerpenes.map(t => t.toLowerCase());
    const cultivarTerpenesLower = cultivar.traits.terpenes.map(t => t.toLowerCase());
    const terpeneMatches = wikiTerpenesLower.filter((t) =>
      cultivarTerpenesLower.includes(t)
    ).length;
    if (terpeneMatches > 0) {
      const terpeneScore = Math.min(25, terpeneMatches * 8);
      score += terpeneScore;
      const matchedTerpenes = wikiTerpenesLower.filter((t) => cultivarTerpenesLower.includes(t));
      rationale.push(`${terpeneMatches} terpene match${terpeneMatches > 1 ? "es" : ""} (${matchedTerpenes.join(", ")})`);
    }

    // Effect profile similarity (0-25 points)
    const wikiEffectsLower = wikiEffects.map(e => e.toLowerCase());
    const cultivarEffectsLower = cultivar.traits.effects.map(e => e.toLowerCase());
    const effectMatches = wikiEffectsLower.filter((e) =>
      cultivarEffectsLower.some(
        (ce) => ce === e || ce.includes(e) || e.includes(ce)
      )
    ).length;
    if (effectMatches > 0) {
      const effectScore = Math.min(25, effectMatches * 6);
      score += effectScore;
      rationale.push(`${effectMatches} effect match${effectMatches > 1 ? "es" : ""}`);
    }

    // Morphology alignment (0-20 points)
    let morphologyScore = 0;
    
    // Bud structure match
    if (cultivar.traits.budStructure && cultivar.traits.budStructure.length > 0) {
      const structureMatch = cultivar.traits.budStructure.some(trait =>
        wikiBudStructure.includes(trait.toLowerCase())
      );
      if (structureMatch) {
        morphologyScore += 7;
        rationale.push("Bud structure alignment");
      }
    }
    
    // Trichome match
    if (cultivar.traits.trichomes && cultivar.traits.trichomes.length > 0) {
      const trichomeMatch = cultivar.traits.trichomes.some(trait =>
        wikiTrichomes.includes(trait.toLowerCase()) || 
        (trait.toLowerCase() === "heavy" && wikiTrichomes.includes("high")) ||
        (trait.toLowerCase() === "moderate" && wikiTrichomes.includes("moderate"))
      );
      if (trichomeMatch) {
        morphologyScore += 6;
        rationale.push("Trichome density alignment");
      }
    }
    
    // Pistil match (from coloration)
    if (cultivar.traits.pistils && cultivar.traits.pistils.length > 0) {
      const pistilMatch = cultivar.traits.pistils.some(pistil =>
        wikiColoration.includes(pistil.toLowerCase())
      );
      if (pistilMatch) {
        morphologyScore += 7;
        rationale.push("Pistil color alignment");
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
