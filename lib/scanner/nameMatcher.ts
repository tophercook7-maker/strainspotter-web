// lib/scanner/nameMatcher.ts
// Phase 2.2 — Name Matching Engine (Real Confidence)
// • Curated strain index
// • Visual-feature voting
// • Probability ladder
// • Explainable match scores

import type { WikiResult, ScanContext } from "./types";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

export type FeatureVote = {
  feature: string;
  value: string;
  confidence: number; // 0-100
  imageIndex: number;
};

export type CultivarVote = {
  cultivarName: string;
  votes: number; // How many images voted for this cultivar
  totalScore: number; // Sum of all scores
  averageScore: number; // Average score across votes
  featureAgreement: number; // Percentage of features that agree
  reasons: string[]; // Explainable reasons
};

export type ProbabilityLadder = {
  tier: "Very High" | "High" | "Moderate" | "Low" | "Very Low";
  minScore: number;
  maxScore: number;
  description: string;
};

export type NameMatchResult = {
  primaryMatch: {
    name: string;
    score: number; // 0-100
    confidenceRange: string;
    probabilityTier: string;
    featureAgreement: number; // 0-100
    reasons: string[];
    featureVotes: FeatureVote[];
  };
  alternateMatches: Array<{
    name: string;
    score: number;
    confidenceRange: string;
    probabilityTier: string;
    reason: string;
  }>;
  visualFeatureVotes: FeatureVote[];
  explainableScores: {
    [cultivarName: string]: {
      score: number;
      breakdown: {
        feature: string;
        contribution: number;
        agreement: number;
      }[];
    };
  };
};

/**
 * Probability ladder - confidence tiers based on feature agreement
 */
const PROBABILITY_LADDER: ProbabilityLadder[] = [
  {
    tier: "Very High",
    minScore: 85,
    maxScore: 100,
    description: "Strong visual agreement across multiple features and images",
  },
  {
    tier: "High",
    minScore: 70,
    maxScore: 84,
    description: "Good visual agreement with consistent features",
  },
  {
    tier: "Moderate",
    minScore: 55,
    maxScore: 69,
    description: "Partial visual agreement, some features match",
  },
  {
    tier: "Low",
    minScore: 40,
    maxScore: 54,
    description: "Limited visual agreement, few features match",
  },
  {
    tier: "Very Low",
    minScore: 0,
    maxScore: 39,
    description: "Minimal visual agreement, uncertain identification",
  },
];

/**
 * Get probability tier for a score
 */
function getProbabilityTier(score: number): string {
  for (const tier of PROBABILITY_LADDER) {
    if (score >= tier.minScore && score <= tier.maxScore) {
      return tier.tier;
    }
  }
  return "Very Low";
}

/**
 * Extract visual features from wiki result
 */
function extractVisualFeatures(wiki: WikiResult, imageIndex: number): FeatureVote[] {
  const features: FeatureVote[] = [];
  const confidence = wiki.identity.confidence;

  // Bud density
  const budStructure = wiki.morphology.budStructure.toLowerCase();
  let budDensity: "low" | "medium" | "high" = "medium";
  if (budStructure.includes("dense") || budStructure.includes("compact") || budStructure.includes("chunky")) {
    budDensity = "high";
  } else if (budStructure.includes("airy") || budStructure.includes("elongated") || budStructure.includes("foxtailed")) {
    budDensity = "low";
  }
  features.push({
    feature: "budDensity",
    value: budDensity,
    confidence,
    imageIndex,
  });

  // Trichome density
  const trichomes = wiki.morphology.trichomes.toLowerCase();
  let trichomeDensity: "low" | "medium" | "high" = "medium";
  if (trichomes.includes("very") || trichomes.includes("extremely") || trichomes.includes("heavy")) {
    trichomeDensity = "high";
  } else if (trichomes.includes("light") || trichomes.includes("sparse")) {
    trichomeDensity = "low";
  }
  features.push({
    feature: "trichomeDensity",
    value: trichomeDensity,
    confidence,
    imageIndex,
  });

  // Leaf shape (infer from genetics)
  const dominance = wiki.genetics.dominance.toLowerCase();
  const leafShape = dominance.includes("indica") ? "broad" : dominance.includes("sativa") ? "narrow" : "broad";
  features.push({
    feature: "leafShape",
    value: leafShape,
    confidence,
    imageIndex,
  });

  // Pistil color
  const coloration = wiki.morphology.coloration.toLowerCase();
  let pistilColor = "orange"; // default
  if (coloration.includes("amber")) pistilColor = "amber";
  else if (coloration.includes("white")) pistilColor = "white";
  else if (coloration.includes("pink")) pistilColor = "pink";
  features.push({
    feature: "pistilColor",
    value: pistilColor,
    confidence,
    imageIndex,
  });

  return features;
}

/**
 * Visual-feature voting - aggregate features across multiple images
 */
function aggregateFeatureVotes(allFeatures: FeatureVote[][]): Map<string, Map<string, number>> {
  // Map<feature, Map<value, count>>
  const featureVotes = new Map<string, Map<string, number>>();

  allFeatures.forEach((imageFeatures) => {
    imageFeatures.forEach((vote) => {
      if (!featureVotes.has(vote.feature)) {
        featureVotes.set(vote.feature, new Map());
      }
      const valueMap = featureVotes.get(vote.feature)!;
      valueMap.set(vote.value, (valueMap.get(vote.value) || 0) + 1);
    });
  });

  return featureVotes;
}

/**
 * Get dominant feature value (most voted)
 */
function getDominantFeatureValue(featureVotes: Map<string, number>): string {
  let maxCount = 0;
  let dominantValue = "";
  
  featureVotes.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      dominantValue = value;
    }
  });

  return dominantValue;
}

/**
 * Calculate feature agreement percentage
 */
function calculateFeatureAgreement(
  dominantFeatures: Map<string, string>,
  cultivar: CultivarReference,
  totalImages: number
): number {
  let agreementCount = 0;
  let totalFeatures = 0;

  // Bud density
  if (dominantFeatures.has("budDensity")) {
    totalFeatures++;
    if (cultivar.morphology.budDensity === dominantFeatures.get("budDensity")) {
      agreementCount++;
    }
  }

  // Trichome density
  if (dominantFeatures.has("trichomeDensity")) {
    totalFeatures++;
    if (cultivar.morphology.trichomeDensity === dominantFeatures.get("trichomeDensity")) {
      agreementCount++;
    }
  }

  // Leaf shape
  if (dominantFeatures.has("leafShape")) {
    totalFeatures++;
    if (cultivar.morphology.leafShape === dominantFeatures.get("leafShape")) {
      agreementCount++;
    }
  }

  // Pistil color
  if (dominantFeatures.has("pistilColor")) {
    totalFeatures++;
    const dominantPistil = dominantFeatures.get("pistilColor")!;
    if (cultivar.morphology.pistilColor.some(c => c.toLowerCase() === dominantPistil)) {
      agreementCount++;
    }
  }

  return totalFeatures > 0 ? Math.round((agreementCount / totalFeatures) * 100) : 0;
}

/**
 * Score a cultivar based on visual features and voting
 */
function scoreCultivar(
  cultivar: CultivarReference,
  dominantFeatures: Map<string, string>,
  featureVotes: Map<string, Map<string, number>>,
  totalImages: number,
  wikiResults: WikiResult[]
): {
  score: number;
  reasons: string[];
  featureBreakdown: Array<{ feature: string; contribution: number; agreement: number }>;
} {
  let score = 0;
  const reasons: string[] = [];
  const featureBreakdown: Array<{ feature: string; contribution: number; agreement: number }> = [];

  // 1. Bud density match (25 points)
  const budDensity = dominantFeatures.get("budDensity");
  if (budDensity && cultivar.morphology.budDensity === budDensity) {
    const voteCount = featureVotes.get("budDensity")?.get(budDensity) || 0;
    const contribution = Math.round((voteCount / totalImages) * 25);
    score += contribution;
    reasons.push(`Bud density matches (${voteCount}/${totalImages} images)`);
    featureBreakdown.push({
      feature: "budDensity",
      contribution,
      agreement: Math.round((voteCount / totalImages) * 100),
    });
  }

  // 2. Trichome density match (25 points)
  const trichomeDensity = dominantFeatures.get("trichomeDensity");
  if (trichomeDensity && cultivar.morphology.trichomeDensity === trichomeDensity) {
    const voteCount = featureVotes.get("trichomeDensity")?.get(trichomeDensity) || 0;
    const contribution = Math.round((voteCount / totalImages) * 25);
    score += contribution;
    reasons.push(`Trichome density matches (${voteCount}/${totalImages} images)`);
    featureBreakdown.push({
      feature: "trichomeDensity",
      contribution,
      agreement: Math.round((voteCount / totalImages) * 100),
    });
  }

  // 3. Leaf shape match (20 points)
  const leafShape = dominantFeatures.get("leafShape");
  if (leafShape && cultivar.morphology.leafShape === leafShape) {
    const voteCount = featureVotes.get("leafShape")?.get(leafShape) || 0;
    const contribution = Math.round((voteCount / totalImages) * 20);
    score += contribution;
    reasons.push(`Leaf shape matches (${voteCount}/${totalImages} images)`);
    featureBreakdown.push({
      feature: "leafShape",
      contribution,
      agreement: Math.round((voteCount / totalImages) * 100),
    });
  }

  // 4. Pistil color match (15 points)
  const pistilColor = dominantFeatures.get("pistilColor");
  if (pistilColor && cultivar.morphology.pistilColor.some(c => c.toLowerCase() === pistilColor)) {
    const voteCount = featureVotes.get("pistilColor")?.get(pistilColor) || 0;
    const contribution = Math.round((voteCount / totalImages) * 15);
    score += contribution;
    reasons.push(`Pistil color matches (${voteCount}/${totalImages} images)`);
    featureBreakdown.push({
      feature: "pistilColor",
      contribution,
      agreement: Math.round((voteCount / totalImages) * 100),
    });
  }

  // 5. Effect overlap (15 points)
  const allEffects = wikiResults.flatMap(w => 
    (w.experience.primaryEffects || w.experience.effects).map(e => e.toLowerCase())
  );
  const cultivarEffects = cultivar.effects.map(e => e.toLowerCase());
  const effectMatches = cultivarEffects.filter(e =>
    allEffects.some(we => we.includes(e) || e.includes(we))
  ).length;
  if (effectMatches > 0) {
    const contribution = Math.min(15, effectMatches * 5);
    score += contribution;
    reasons.push(`${effectMatches} effect match${effectMatches > 1 ? "es" : ""}`);
    featureBreakdown.push({
      feature: "effects",
      contribution,
      agreement: Math.round((effectMatches / cultivar.effects.length) * 100),
    });
  }

  return {
    score: Math.min(100, Math.round(score)),
    reasons,
    featureBreakdown,
  };
}

/**
 * Convert score to confidence range
 */
function scoreToConfidenceRange(score: number): string {
  if (score >= 85) return "85-95%";
  if (score >= 70) return "70-85%";
  if (score >= 55) return "55-70%";
  if (score >= 40) return "40-55%";
  if (score >= 25) return "25-40%";
  return "15-30%";
}

/**
 * Match cultivars using visual-feature voting and probability ladder
 * Phase 2.2 — Real confidence with explainable scores
 */
export function matchCultivarsWithVoting(
  wikiResults: WikiResult[],
  context: ScanContext
): NameMatchResult {
  const totalImages = wikiResults.length;

  // Extract visual features from all images
  const allFeatureVotes = wikiResults.map((wiki, idx) => extractVisualFeatures(wiki, idx));
  const flatFeatureVotes = allFeatureVotes.flat();

  // Aggregate feature votes
  const aggregatedVotes = aggregateFeatureVotes(allFeatureVotes);

  // Get dominant feature values (most voted)
  const dominantFeatures = new Map<string, string>();
  aggregatedVotes.forEach((valueMap, feature) => {
    dominantFeatures.set(feature, getDominantFeatureValue(valueMap));
  });

  // Score each cultivar
  const scored: Array<{
    cultivar: CultivarReference;
    score: number;
    reasons: string[];
    featureBreakdown: Array<{ feature: string; contribution: number; agreement: number }>;
    featureAgreement: number;
  }> = [];

  for (const cultivar of CULTIVAR_LIBRARY) {
    const featureAgreement = calculateFeatureAgreement(dominantFeatures, cultivar, totalImages);
    const { score, reasons, featureBreakdown } = scoreCultivar(
      cultivar,
      dominantFeatures,
      aggregatedVotes,
      totalImages,
      wikiResults
    );

    if (score > 0) {
      scored.push({
        cultivar,
        score,
        reasons,
        featureBreakdown,
        featureAgreement,
      });
    }
  }

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Primary match
  const primary = scored[0];
  const primaryMatch = primary
    ? {
        name: primary.cultivar.name,
        score: primary.score,
        confidenceRange: scoreToConfidenceRange(primary.score),
        probabilityTier: getProbabilityTier(primary.score),
        featureAgreement: primary.featureAgreement,
        reasons: primary.reasons,
        featureVotes: flatFeatureVotes.filter(v => 
          v.feature === "budDensity" || v.feature === "trichomeDensity"
        ),
      }
    : {
        name: "Phenotype-Closest Hybrid",
        score: 0,
        confidenceRange: "15-30%",
        probabilityTier: "Very Low",
        featureAgreement: 0,
        reasons: ["No strong cultivar match found"],
        featureVotes: [],
      };

  // Alternates
  const alternates = scored.slice(1, 4).map(m => ({
    name: m.cultivar.name,
    score: m.score,
    confidenceRange: scoreToConfidenceRange(m.score),
    probabilityTier: getProbabilityTier(m.score),
    reason: m.reasons[0] || "Partial morphological match",
  }));

  // Explainable scores
  const explainableScores: { [key: string]: any } = {};
  scored.forEach(({ cultivar, score, featureBreakdown }) => {
    explainableScores[cultivar.name] = {
      score,
      breakdown: featureBreakdown,
    };
  });

  return {
    primaryMatch,
    alternateMatches: alternates,
    visualFeatureVotes: flatFeatureVotes,
    explainableScores,
  };
}
