// lib/scanner/cultivarMatcher.ts
// 🔒 Phase 2.2 — Cultivar Name Matching & Ranking Engine

import type { WikiResult, ScanContext } from "./types";
import { CULTIVAR_LIBRARY } from "./cultivarReference";

export type CultivarMatch = {
  name: string;
  score: number; // 0-100 internal only
  reasons: string[];
};

/**
 * Match cultivars based on WikiResult and ScanContext
 * Returns top 5 matches sorted by score (highest first)
 */
export function matchCultivars(
  wiki: WikiResult,
  context: ScanContext
): CultivarMatch[] {
  return CULTIVAR_LIBRARY.map(cultivar => {
    let score = 0;
    const reasons: string[] = [];

    // Normalize bud structure for comparison
    const wikiBudStructure = wiki.morphology.budStructure.toLowerCase();
    const cultivarBudStructures = cultivar.traits.budStructure.map(s => s.toLowerCase());

    if (cultivarBudStructures.some(trait => wikiBudStructure.includes(trait))) {
      score += 25;
      reasons.push("Bud structure closely matches reference specimens");
    }

    // Normalize trichome density for comparison
    const wikiTrichomes = wiki.morphology.trichomes.toLowerCase();
    const cultivarTrichomes = cultivar.traits.trichomes.map(t => t.toLowerCase());

    if (cultivarTrichomes.some(trait => 
      wikiTrichomes.includes(trait) || 
      (trait === "heavy" && wikiTrichomes.includes("high")) ||
      (trait === "moderate" && wikiTrichomes.includes("moderate"))
    )) {
      score += 25;
      reasons.push("Trichome density aligns with known phenotype");
    }

    // Check effect profile overlap
    const wikiPrimaryEffects = (wiki.experience.primaryEffects || wiki.experience.effects).map(e => e.toLowerCase());
    const cultivarEffects = cultivar.traits.effects.map(e => e.toLowerCase());

    if (cultivarEffects.some(e =>
      wikiPrimaryEffects.some(we => we.includes(e) || e.includes(we))
    )) {
      score += 20;
      reasons.push("Effect profile overlaps documented reports");
    }

    return {
      name: cultivar.name,
      score,
      reasons
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
}
