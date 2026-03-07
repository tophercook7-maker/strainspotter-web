// Phase 5.0 — Strain DNA Fingerprint (DB-weighted decision core)
// lib/scanner/strainDnaFingerprint.ts

import type { CultivarReference } from "./cultivarLibrary";
import type { VisualSignature } from "./visualFeatureExtraction";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 5.0 — Strain DNA Fingerprint
 * 
 * A unique signature combining:
 * - Genetic lineage (40%)
 * - Visual baseline (30%)
 * - Terpene profile (20%)
 * - Effect profile (10%)
 * 
 * Used for DB-weighted decision making, prioritizing database knowledge
 * over image-only signals.
 */
export type StrainDnaFingerprint = {
  strainName: string;
  geneticHash: string; // Normalized lineage/genetics signature
  visualHash: string; // Normalized visual characteristics signature
  terpeneHash: string; // Normalized terpene profile signature
  effectHash: string; // Normalized effect profile signature
  fullFingerprint: string; // Combined hash for quick comparison
  dbWeight: number; // 0-1, how much to weight DB vs image signals (higher = trust DB more)
  confidence: number; // 0-100, fingerprint completeness/quality
  components: {
    genetics: { weight: number; score: number; normalized: string };
    visual: { weight: number; score: number; normalized: string };
    terpene: { weight: number; score: number; normalized: string };
    effect: { weight: number; score: number; normalized: string };
  };
};

/**
 * Phase 5.0.1 — Generate Genetic Hash
 * Normalizes genetics/lineage into a comparable signature
 */
function generateGeneticHash(strain: CultivarReference): string {
  // Normalize genetics string
  const genetics = (strain.genetics || "").toLowerCase()
    .replace(/[^a-z0-9×x]/g, " ") // Remove special chars, keep × and x
    .replace(/\s+/g, " ")
    .trim();
  
  // Extract parent names (format: "parent1 × parent2" or "parent1 x parent2")
  const parents = genetics
    .split(/[×x]/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .sort() // Sort for consistency
    .join("×");
  
  // Include type/dominance
  const type = (strain.type || strain.dominantType || "hybrid").toLowerCase();
  
  // Create hash: "parent1×parent2|type"
  return `${parents}|${type}`;
}

/**
 * Phase 5.0.2 — Generate Visual Hash
 * Normalizes visual characteristics into a comparable signature
 */
function generateVisualHash(strain: CultivarReference): string {
  const visual = strain.visualProfile || {
    budStructure: strain.morphology.budDensity,
    trichomeDensity: strain.morphology.trichomeDensity,
    leafShape: strain.morphology.leafShape,
    pistilColor: strain.morphology.pistilColor,
    colorProfile: "",
  };
  
  // Normalize visual characteristics
  const bud = ((visual as any).budStructure || (visual as any).budDensity || "medium").toLowerCase();
  const trichome = ((visual as any).trichomeDensity || "medium").toLowerCase();
  const leaf = ((visual as any).leafShape || "broad").toLowerCase();
  const pistils = ((visual as any).pistilColor || []).map((c: string) => c.toLowerCase()).sort().join(",");
  const color = ((visual as any).colorProfile || "").toLowerCase()
    .replace(/[^a-z]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50); // Limit length
  
  // Create hash: "bud:trichome:leaf:pistils:color"
  return `${bud}:${trichome}:${leaf}:${pistils}:${color.substring(0, 20)}`;
}

/**
 * Phase 5.0.3 — Generate Terpene Hash
 * Normalizes terpene profile into a comparable signature
 */
function generateTerpeneHash(strain: CultivarReference): string {
  const terpenes = (strain.terpeneProfile || strain.commonTerpenes || [])
    .map(t => typeof t === "string" ? t : (t as any).name || "")
    .map(t => t.toLowerCase().trim())
    .filter(t => t.length > 0)
    .sort() // Sort for consistency
    .slice(0, 5); // Top 5 terpenes
  
  // Create hash: "terpene1,terpene2,terpene3"
  return terpenes.join(",");
}

/**
 * Phase 5.0.4 — Generate Effect Hash
 * Normalizes effect profile into a comparable signature
 */
function generateEffectHash(strain: CultivarReference): string {
  const effects = (strain.effects || [])
    .map(e => e.toLowerCase().trim())
    .filter(e => e.length > 0)
    .sort() // Sort for consistency
    .slice(0, 5); // Top 5 effects
  
  // Create hash: "effect1,effect2,effect3"
  return effects.join(",");
}

/**
 * Phase 5.0.5 — Calculate Component Scores
 * Scores each component based on data completeness
 */
function calculateComponentScores(strain: CultivarReference): {
  genetics: number;
  visual: number;
  terpene: number;
  effect: number;
} {
  // Genetics score: 0-100 based on completeness
  let geneticsScore = 0;
  if (strain.genetics && strain.genetics.length > 5) {
    geneticsScore += 50; // Has genetics string
  }
  if (strain.type || strain.dominantType) {
    geneticsScore += 50; // Has type classification
  }
  
  // Visual score: 0-100 based on completeness
  let visualScore = 0;
  const visual = strain.visualProfile || strain.morphology;
  if ((visual as any).budStructure || (visual as any).budDensity) visualScore += 20;
  if ((visual as any).trichomeDensity) visualScore += 20;
  if ((visual as any).leafShape) visualScore += 20;
  if ((visual as any).pistilColor && (visual as any).pistilColor.length > 0) visualScore += 20;
  if ((visual as any).colorProfile && (visual as any).colorProfile.length > 10) visualScore += 20;
  
  // Terpene score: 0-100 based on completeness
  const terpenes = strain.terpeneProfile || strain.commonTerpenes || [];
  const terpeneScore = Math.min(100, terpenes.length * 20); // 20 points per terpene, max 100
  
  // Effect score: 0-100 based on completeness
  const effects = strain.effects || [];
  const effectScore = Math.min(100, effects.length * 20); // 20 points per effect, max 100
  
  return {
    genetics: geneticsScore,
    visual: visualScore,
    terpene: terpeneScore,
    effect: effectScore,
  };
}

/**
 * Phase 5.0 — Generate Strain DNA Fingerprint
 * 
 * Creates a unique fingerprint for a strain from the database.
 * This fingerprint is used for DB-weighted decision making.
 */
export function generateStrainDnaFingerprint(
  strain: CultivarReference
): StrainDnaFingerprint {
  // Generate component hashes
  const geneticHash = generateGeneticHash(strain);
  const visualHash = generateVisualHash(strain);
  const terpeneHash = generateTerpeneHash(strain);
  const effectHash = generateEffectHash(strain);
  
  // Calculate component scores
  const scores = calculateComponentScores(strain);
  
  // Calculate overall confidence (weighted average of component scores)
  const weights = {
    genetics: 0.40,
    visual: 0.30,
    terpene: 0.20,
    effect: 0.10,
  };
  
  const confidence = Math.round(
    scores.genetics * weights.genetics +
    scores.visual * weights.visual +
    scores.terpene * weights.terpene +
    scores.effect * weights.effect
  );
  
  // Calculate DB weight (how much to trust DB vs image signals)
  // Higher confidence = higher DB weight (trust DB more)
  // Lower confidence = lower DB weight (rely more on image signals)
  const dbWeight = Math.min(1.0, Math.max(0.3, confidence / 100));
  
  // Create full fingerprint (combined hash for quick comparison)
  const fullFingerprint = `${geneticHash}|${visualHash}|${terpeneHash}|${effectHash}`;
  
  return {
    strainName: strain.name,
    geneticHash,
    visualHash,
    terpeneHash,
    effectHash,
    fullFingerprint,
    dbWeight,
    confidence,
    components: {
      genetics: {
        weight: weights.genetics,
        score: scores.genetics,
        normalized: geneticHash,
      },
      visual: {
        weight: weights.visual,
        score: scores.visual,
        normalized: visualHash,
      },
      terpene: {
        weight: weights.terpene,
        score: scores.terpene,
        normalized: terpeneHash,
      },
      effect: {
        weight: weights.effect,
        score: scores.effect,
        normalized: effectHash,
      },
    },
  };
}

/**
 * Phase 5.0.6 — Generate Observed Fingerprint
 * 
 * Creates a fingerprint from observed image/analysis data
 * (without database reference)
 */
export type ObservedFingerprint = {
  geneticHash: string | null; // May be null if no genetics observed
  visualHash: string; // From visual signature
  terpeneHash: string | null; // May be null if no terpenes observed
  effectHash: string | null; // May be null if no effects observed
  fullFingerprint: string;
  confidence: number; // 0-100, how complete the observed data is
  components: {
    genetics: { available: boolean; normalized: string | null };
    visual: { available: boolean; normalized: string };
    terpene: { available: boolean; normalized: string | null };
    effect: { available: boolean; normalized: string | null };
  };
};

/**
 * Phase 5.0.6 — Generate Observed Fingerprint from Image Data
 */
export function generateObservedFingerprint(
  visualSignature: VisualSignature | FusedFeatures,
  terpeneProfile?: string[] | Array<{ name: string }> | any,
  effects?: string[],
  genetics?: string
): ObservedFingerprint {
  // Generate visual hash from signature
  let visualHash = "";
  if ("densityScore" in visualSignature) {
    // VisualSignature
    const sig = visualSignature as VisualSignature;
    const density = sig.densityScore >= 70 ? "high" : sig.densityScore >= 40 ? "medium" : "low";
    const trichome = sig.trichomeLevel;
    const color = sig.colorProfile.primary;
    const pistils = sig.pistilProfile.colors.map(c => c.toLowerCase()).sort().join(",");
    visualHash = `${density}:${trichome}:${color}:${pistils}`;
  } else {
    // FusedFeatures
    const fused = visualSignature as FusedFeatures;
    const bud = (fused.budStructure || "medium").toLowerCase();
    const trichome = (fused.trichomeDensity || "medium").toLowerCase();
    const leaf = (fused.leafShape || "broad").toLowerCase();
    const pistils = (fused.pistilColor || "orange").toLowerCase();
    visualHash = `${bud}:${trichome}:${leaf}:${pistils}`;
  }
  
  // Generate genetic hash (if available)
  let geneticHash: string | null = null;
  if (genetics) {
    const normalized = genetics.toLowerCase()
      .replace(/[^a-z0-9×x]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const parents = normalized
      .split(/[×x]/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .sort()
      .join("×");
    geneticHash = parents || null;
  }
  
  // Generate terpene hash (if available)
  let terpeneHash: string | null = null;
  if (terpeneProfile) {
    let terpenes: string[] = [];
    if (Array.isArray(terpeneProfile)) {
      terpenes = terpeneProfile.map((t: any) => typeof t === "string" ? t : (t.name || ""));
    } else if (terpeneProfile.terpenes) {
      terpenes = terpeneProfile.terpenes.map((t: any) => typeof t === "string" ? t : (t.name || ""));
    }
    terpeneHash = terpenes
      .map((t: string) => t.toLowerCase().trim())
      .filter((t: string) => t.length > 0)
      .sort()
      .slice(0, 5)
      .join(",") || null;
  }
  
  // Generate effect hash (if available)
  let effectHash: string | null = null;
  if (effects && effects.length > 0) {
    effectHash = effects
      .map(e => e.toLowerCase().trim())
      .filter(e => e.length > 0)
      .sort()
      .slice(0, 5)
      .join(",");
  }
  
  // Calculate confidence (how complete the observed data is)
  let confidence = 30; // Base: visual always available
  if (geneticHash) confidence += 40;
  if (terpeneHash) confidence += 20;
  if (effectHash) confidence += 10;
  
  // Create full fingerprint
  const fullFingerprint = [
    geneticHash || "unknown",
    visualHash,
    terpeneHash || "unknown",
    effectHash || "unknown",
  ].join("|");
  
  return {
    geneticHash,
    visualHash,
    terpeneHash,
    effectHash,
    fullFingerprint,
    confidence,
    components: {
      genetics: { available: geneticHash !== null, normalized: geneticHash },
      visual: { available: true, normalized: visualHash },
      terpene: { available: terpeneHash !== null, normalized: terpeneHash },
      effect: { available: effectHash !== null, normalized: effectHash },
    },
  };
}

/**
 * Phase 5.0.7 — Compare Fingerprints
 * 
 * Compares observed fingerprint to strain DNA fingerprint
 * Returns similarity score (0-1) and component matches
 */
export type FingerprintComparison = {
  overallSimilarity: number; // 0-1
  componentSimilarities: {
    genetics: number; // 0-1
    visual: number; // 0-1
    terpene: number; // 0-1
    effect: number; // 0-1
  };
  dbWeightedScore: number; // 0-1, similarity weighted by DB confidence
  matchConfidence: number; // 0-100, overall match confidence
  explanation: string[];
};

/**
 * Phase 5.0.7 — Compare Observed to Strain DNA Fingerprint
 */
export function compareFingerprints(
  observed: ObservedFingerprint,
  strain: StrainDnaFingerprint
): FingerprintComparison {
  const explanation: string[] = [];
  
  // Compare genetics (40% weight)
  let geneticsSimilarity = 0;
  if (observed.components.genetics.available && strain.components.genetics.normalized) {
    if (observed.components.genetics.normalized === strain.components.genetics.normalized) {
      geneticsSimilarity = 1.0;
      explanation.push("Exact genetic match");
    } else {
      // Partial match: check if parents overlap
      const observedParents = observed.components.genetics.normalized?.split("×") || [];
      const strainParents = strain.components.genetics.normalized.split("×");
      const overlap = observedParents.filter(obs => 
        strainParents.some(strain => strain.includes(obs) || obs.includes(strain))
      ).length;
      if (overlap > 0) {
        geneticsSimilarity = overlap / Math.max(observedParents.length, strainParents.length);
        explanation.push(`Partial genetic match (${overlap} parent${overlap > 1 ? 's' : ''} overlap)`);
      } else {
        explanation.push("No genetic match");
      }
    }
  } else {
    explanation.push("Genetics not available for comparison");
  }
  
  // Compare visual (30% weight)
  let visualSimilarity = 0;
  if (observed.components.visual.normalized === strain.components.visual.normalized) {
    visualSimilarity = 1.0;
    explanation.push("Exact visual match");
  } else {
    // Partial match: compare components
    const observedParts = observed.components.visual.normalized.split(":");
    const strainParts = strain.components.visual.normalized.split(":");
    let matches = 0;
    for (let i = 0; i < Math.min(observedParts.length, strainParts.length); i++) {
      if (observedParts[i] === strainParts[i]) {
        matches++;
      }
    }
    visualSimilarity = matches / Math.max(observedParts.length, strainParts.length);
    if (visualSimilarity > 0.5) {
      explanation.push(`Strong visual match (${matches}/${Math.max(observedParts.length, strainParts.length)} components)`);
    } else if (visualSimilarity > 0) {
      explanation.push(`Partial visual match (${matches}/${Math.max(observedParts.length, strainParts.length)} components)`);
    } else {
      explanation.push("No visual match");
    }
  }
  
  // Compare terpenes (20% weight)
  let terpeneSimilarity = 0;
  if (observed.components.terpene.available && strain.components.terpene.normalized) {
    const observedTerps = observed.components.terpene.normalized?.split(",") || [];
    const strainTerps = strain.components.terpene.normalized.split(",");
    const overlap = observedTerps.filter(obs => strainTerps.includes(obs)).length;
    if (overlap > 0) {
      terpeneSimilarity = overlap / Math.max(observedTerps.length, strainTerps.length);
      explanation.push(`Terpene match (${overlap} shared)`);
    } else {
      explanation.push("No terpene match");
    }
  } else {
    explanation.push("Terpenes not available for comparison");
  }
  
  // Compare effects (10% weight)
  let effectSimilarity = 0;
  if (observed.components.effect.available && strain.components.effect.normalized) {
    const observedEffects = observed.components.effect.normalized?.split(",") || [];
    const strainEffects = strain.components.effect.normalized.split(",");
    const overlap = observedEffects.filter(obs => strainEffects.includes(obs)).length;
    if (overlap > 0) {
      effectSimilarity = overlap / Math.max(observedEffects.length, strainEffects.length);
      explanation.push(`Effect match (${overlap} shared)`);
    } else {
      explanation.push("No effect match");
    }
  } else {
    explanation.push("Effects not available for comparison");
  }
  
  // Calculate overall similarity (weighted)
  const overallSimilarity = 
    geneticsSimilarity * 0.40 +
    visualSimilarity * 0.30 +
    terpeneSimilarity * 0.20 +
    effectSimilarity * 0.10;
  
  // Calculate DB-weighted score (trust DB more if DB confidence is high)
  const dbWeightedScore = overallSimilarity * strain.dbWeight + 
                         overallSimilarity * (1 - strain.dbWeight) * (observed.confidence / 100);
  
  // Calculate match confidence (0-100)
  const matchConfidence = Math.round(
    overallSimilarity * 100 * strain.dbWeight +
    overallSimilarity * 100 * (1 - strain.dbWeight) * (observed.confidence / 100)
  );
  
  return {
    overallSimilarity,
    componentSimilarities: {
      genetics: geneticsSimilarity,
      visual: visualSimilarity,
      terpene: terpeneSimilarity,
      effect: effectSimilarity,
    },
    dbWeightedScore,
    matchConfidence,
    explanation,
  };
}

/**
 * Phase 5.0.8 — DB-Weighted Decision
 * 
 * Makes a decision using DB-weighted approach:
 * - High DB confidence → trust DB more, use image as validation
 * - Low DB confidence → trust image more, use DB as hint
 */
export type DbWeightedDecision = {
  strainName: string;
  finalScore: number; // 0-100, final decision score
  dbContribution: number; // 0-100, how much DB contributed
  imageContribution: number; // 0-100, how much image contributed
  decisionConfidence: number; // 0-100, confidence in decision
  reasoning: string[];
};

/**
 * Phase 5.0.8 — Make DB-Weighted Decision
 */
export function makeDbWeightedDecision(
  strain: StrainDnaFingerprint,
  observed: ObservedFingerprint,
  imageScore: number, // 0-100, score from image analysis
  dbScore: number // 0-100, score from database match
): DbWeightedDecision {
  const comparison = compareFingerprints(observed, strain);
  
  // Calculate contributions
  const dbContribution = dbScore * strain.dbWeight;
  const imageContribution = imageScore * (1 - strain.dbWeight);
  
  // Final score: weighted combination
  const finalScore = Math.round(
    dbContribution + imageContribution
  );
  
  // Decision confidence: based on fingerprint match and score agreement
  const scoreAgreement = 1 - Math.abs(dbScore - imageScore) / 100;
  const decisionConfidence = Math.round(
    comparison.matchConfidence * 0.6 + // Fingerprint match (60%)
    scoreAgreement * 100 * 0.4 // Score agreement (40%)
  );
  
  // Build reasoning
  const reasoning: string[] = [];
  reasoning.push(`DB confidence: ${strain.confidence}% (weight: ${Math.round(strain.dbWeight * 100)}%)`);
  reasoning.push(`Fingerprint match: ${Math.round(comparison.overallSimilarity * 100)}%`);
  reasoning.push(...comparison.explanation.slice(0, 3)); // Top 3 explanations
  
  if (strain.dbWeight >= 0.7) {
    reasoning.push("High DB confidence — database knowledge prioritized");
  } else if (strain.dbWeight >= 0.5) {
    reasoning.push("Moderate DB confidence — balanced DB/image weighting");
  } else {
    reasoning.push("Low DB confidence — image signals prioritized");
  }
  
  return {
    strainName: strain.strainName,
    finalScore,
    dbContribution: Math.round(dbContribution),
    imageContribution: Math.round(imageContribution),
    decisionConfidence,
    reasoning,
  };
}
