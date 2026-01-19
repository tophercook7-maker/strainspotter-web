// lib/scanner/cultivarMatcher.ts
// 🔒 Phase 2.2 — Cultivar Name Matching & Ranking Engine

import type { WikiResult, ScanContext } from "./types";
import { CULTIVAR_LIBRARY } from "./cultivarReference";

export type CultivarMatch = {
  name: string;
  score: number; // Raw score 0-100
  confidenceRange: string; // Normalized percentage range (e.g. "72-84%")
  reasons: string[];
};

/**
 * Normalize raw score to percentage range
 */
function normalizeScoreToRange(rawScore: number): string {
  // Map raw score (0-100) to percentage range
  // Higher scores get tighter ranges, lower scores get wider ranges
  if (rawScore >= 60) {
    const base = 72 + Math.floor((rawScore - 60) / 40 * 12); // 72-84%
    return `${base}-${base + 4}%`;
  } else if (rawScore >= 40) {
    const base = 60 + Math.floor((rawScore - 40) / 20 * 12); // 60-72%
    return `${base}-${base + 6}%`;
  } else if (rawScore >= 20) {
    const base = 45 + Math.floor((rawScore - 20) / 20 * 15); // 45-60%
    return `${base}-${base + 8}%`;
  } else {
    return "30-45%";
  }
}

/**
 * Match cultivars based on WikiResult and ScanContext
 * Returns top 5 matches sorted by score (highest first)
 * Scores based on: bud structure, trichome density, leaf shape, pistil color, effect overlap
 */
export function matchCultivars(
  wiki: WikiResult,
  context: ScanContext
): CultivarMatch[] {
  // Extract wiki data
  const wikiBudStructure = wiki.morphology.budStructure.toLowerCase();
  const wikiTrichomes = wiki.morphology.trichomes.toLowerCase();
  const wikiColoration = wiki.morphology.coloration.toLowerCase();
  const wikiPrimaryEffects = (wiki.experience.primaryEffects || wiki.experience.effects).map(e => e.toLowerCase());
  const wikiLeafShape = context.detectedFeatures?.leafShape?.toLowerCase() || "";

  return CULTIVAR_LIBRARY.map(cultivar => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Bud structure match (0-25 points)
    const cultivarBudStructures = cultivar.traits.budStructure.map(s => s.toLowerCase());
    if (cultivarBudStructures.some(trait => wikiBudStructure.includes(trait))) {
      score += 25;
      reasons.push("Bud structure closely matches reference specimens");
    }

    // 2. Trichome density match (0-25 points)
    const cultivarTrichomes = cultivar.traits.trichomes.map(t => t.toLowerCase());
    if (cultivarTrichomes.some(trait => 
      wikiTrichomes.includes(trait) || 
      (trait === "heavy" && wikiTrichomes.includes("high")) ||
      (trait === "moderate" && wikiTrichomes.includes("moderate")) ||
      (trait === "very high" && (wikiTrichomes.includes("very") || wikiTrichomes.includes("extremely")))
    )) {
      score += 25;
      reasons.push("Trichome density aligns with known phenotype");
    }

    // 3. Pistil color match (0-15 points)
    const cultivarPistils = cultivar.traits.pistils.map(p => p.toLowerCase());
    if (cultivarPistils.some(pistil => wikiColoration.includes(pistil))) {
      score += 15;
      reasons.push("Pistil color matches documented characteristics");
    }

    // 4. Leaf shape match (0-15 points) - if available in context
    if (wikiLeafShape && context.detectedFeatures?.leafShape) {
      // Basic leaf shape matching (broad vs narrow)
      const isBroad = wikiLeafShape.includes("broad") || wikiLeafShape.includes("wide");
      const isNarrow = wikiLeafShape.includes("narrow") || wikiLeafShape.includes("thin");
      
      // Indica-dominant typically has broader leaves, Sativa has narrower
      const cultivarGenetics = cultivar.genetics.toLowerCase();
      if ((isBroad && cultivarGenetics.includes("indica")) || 
          (isNarrow && cultivarGenetics.includes("sativa"))) {
        score += 15;
        reasons.push("Leaf shape aligns with genetic profile");
      }
    }

    // 5. Effect profile overlap (0-20 points)
    const cultivarEffects = cultivar.traits.effects.map(e => e.toLowerCase());
    const effectMatches = cultivarEffects.filter(e =>
      wikiPrimaryEffects.some(we => we.includes(e) || e.includes(we))
    ).length;
    
    if (effectMatches > 0) {
      const effectScore = Math.min(20, effectMatches * 7);
      score += effectScore;
      reasons.push(`${effectMatches} effect match${effectMatches > 1 ? "es" : ""} with documented profile`);
    }

    // Normalize score to percentage range
    const confidenceRange = normalizeScoreToRange(score);

    return {
      name: cultivar.name,
      score: Math.min(100, Math.round(score)),
      confidenceRange,
      reasons
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
}
