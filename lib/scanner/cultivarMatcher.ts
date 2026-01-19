// lib/scanner/cultivarMatcher.ts
// Phase 2.3 — Cultivar Matching Engine (DATA ONLY, NO PROSE)

import type { WikiResult, ScanContext } from "./types";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

export type CultivarMatchResult = {
  primary: {
    name: string;
    score: number; // 0-100
    confidenceRange: string; // e.g. "72-84%"
    reasons: string[];
  };
  alternates: Array<{
    name: string;
    score: number;
    confidenceRange: string;
    reason: string; // Single primary reason
  }>;
};

/**
 * Normalize score to confidence range
 */
function scoreToConfidenceRange(score: number): string {
  if (score >= 70) return "78-88%";
  if (score >= 60) return "72-82%";
  if (score >= 50) return "65-75%";
  if (score >= 40) return "58-68%";
  if (score >= 30) return "50-60%";
  if (score >= 20) return "42-52%";
  return "35-45%";
}

/**
 * Extract morphology density from wiki
 */
function extractBudDensity(wiki: WikiResult): "low" | "medium" | "high" {
  const structure = wiki.morphology.budStructure.toLowerCase();
  if (structure.includes("dense") || structure.includes("compact") || structure.includes("chunky")) {
    return "high";
  }
  if (structure.includes("airy") || structure.includes("elongated") || structure.includes("foxtailed")) {
    return "low";
  }
  return "medium";
}

/**
 * Extract trichome density from wiki
 */
function extractTrichomeDensity(wiki: WikiResult): "low" | "medium" | "high" {
  const trichomes = wiki.morphology.trichomes.toLowerCase();
  if (trichomes.includes("very") || trichomes.includes("extremely") || trichomes.includes("heavy")) {
    return "high";
  }
  if (trichomes.includes("moderate") || trichomes.includes("medium")) {
    return "medium";
  }
  return "low";
}

/**
 * Extract leaf shape from context or infer from genetics
 */
function extractLeafShape(wiki: WikiResult, context: ScanContext): "narrow" | "broad" {
  if (context.detectedFeatures?.leafShape) {
    const shape = context.detectedFeatures.leafShape.toLowerCase();
    if (shape.includes("narrow") || shape.includes("thin")) return "narrow";
    if (shape.includes("broad") || shape.includes("wide")) return "broad";
  }
  
  // Infer from genetics
  const dominance = wiki.genetics.dominance.toLowerCase();
  if (dominance.includes("indica")) return "broad";
  if (dominance.includes("sativa")) return "narrow";
  return "broad"; // Default
}

/**
 * Extract pistil colors from wiki
 */
function extractPistilColors(wiki: WikiResult): string[] {
  const coloration = wiki.morphology.coloration.toLowerCase();
  const colors: string[] = [];
  
  if (coloration.includes("orange")) colors.push("orange");
  if (coloration.includes("amber")) colors.push("amber");
  if (coloration.includes("white")) colors.push("white");
  if (coloration.includes("pink")) colors.push("pink");
  
  return colors.length > 0 ? colors : ["orange"]; // Default
}

/**
 * Match cultivars based on WikiResult and ScanContext
 * Returns primary match + ranked alternates
 * NO PROSE - DATA ONLY
 */
export function matchCultivars(
  wiki: WikiResult,
  context: ScanContext
): CultivarMatchResult {
  // Extract wiki morphology
  const wikiBudDensity = extractBudDensity(wiki);
  const wikiTrichomeDensity = extractTrichomeDensity(wiki);
  const wikiLeafShape = extractLeafShape(wiki, context);
  const wikiPistilColors = extractPistilColors(wiki);
  const wikiEffects = (wiki.experience.primaryEffects || wiki.experience.effects).map(e => e.toLowerCase());

  // Score each cultivar
  const scored: Array<{
    cultivar: CultivarReference;
    score: number;
    reasons: string[];
  }> = [];

  for (const cultivar of CULTIVAR_LIBRARY) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Morphology match = 45% (45 points)
    if (cultivar.morphology.budDensity === wikiBudDensity) {
      score += 20;
      reasons.push("Bud density matches");
    }
    if (cultivar.morphology.leafShape === wikiLeafShape) {
      score += 15;
      reasons.push("Leaf shape matches");
    }
    if (cultivar.morphology.budDensity === wikiBudDensity && cultivar.morphology.leafShape === wikiLeafShape) {
      score += 10; // Bonus for both matching
    }

    // 2. Trichome density = 20% (20 points)
    if (cultivar.morphology.trichomeDensity === wikiTrichomeDensity) {
      score += 20;
      reasons.push("Trichome density matches");
    }

    // 3. Leaf shape = 15% (15 points) - already counted in morphology, but separate check
    // (Already included above)

    // 4. Pistil color = 10% (10 points)
    const pistilMatch = cultivar.morphology.pistilColor.some(c => 
      wikiPistilColors.some(w => w === c.toLowerCase())
    );
    if (pistilMatch) {
      score += 10;
      reasons.push("Pistil color matches");
    }

    // 5. Effect overlap = 10% (10 points)
    const cultivarEffects = cultivar.effects.map(e => e.toLowerCase());
    const effectMatches = cultivarEffects.filter(e =>
      wikiEffects.some(we => we.includes(e) || e.includes(we))
    ).length;
    if (effectMatches > 0) {
      const effectScore = Math.min(10, effectMatches * 3);
      score += effectScore;
      reasons.push(`${effectMatches} effect match${effectMatches > 1 ? "es" : ""}`);
    }

    if (score > 0) {
      scored.push({
        cultivar,
        score: Math.min(100, Math.round(score)),
        reasons,
      });
    }
  }

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Primary match (top scorer)
  const primary = scored[0];
  const primaryMatch = primary
    ? {
        name: primary.cultivar.name,
        score: primary.score,
        confidenceRange: scoreToConfidenceRange(primary.score),
        reasons: primary.reasons,
      }
    : {
        name: "Phenotype-Closest Hybrid",
        score: 0,
        confidenceRange: "30-40%",
        reasons: ["No strong cultivar match found"],
      };

  // Alternates (at least 3, exclude primary)
  const alternates = scored
    .slice(1, 4) // Top 3 alternates
    .map(m => ({
      name: m.cultivar.name,
      score: m.score,
      confidenceRange: scoreToConfidenceRange(m.score),
      reason: m.reasons[0] || "Partial morphological match",
    }));

  // Ensure at least 3 alternates
  while (alternates.length < 3 && scored.length > alternates.length + 1) {
    const next = scored[alternates.length + 1];
    if (next) {
      alternates.push({
        name: next.cultivar.name,
        score: next.score,
        confidenceRange: scoreToConfidenceRange(next.score),
        reason: next.reasons[0] || "Partial match",
      });
    } else {
      break;
    }
  }

  return {
    primary: primaryMatch,
    alternates,
  };
}
