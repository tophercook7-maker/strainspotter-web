// Phase 4.0.3 — CONFIDENCE CALIBRATION & TRUST LAYER
// lib/scanner/confidenceV403.ts

/**
 * Phase 4.0.3 — Confidence Breakdown
 * 
 * Explains how final confidence was calculated with component weights and penalties.
 */
export type ConfidenceBreakdown = {
  final: number;
  capped: boolean;
  capReason?: string;
  components: {
    databaseAlignment: number;
    consensusAgreement: number;
    imageQuality: number;
    distinctness: number;
    nameStability: number;
    penalties: number;
  };
  notes: string[];
};

/**
 * Clamp value to 0..1 range
 */
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Phase 4.0.3 — Compute Confidence V403
 * 
 * Weighted confidence model with explainable components and penalties.
 * 
 * Base components (0..100 points total):
 * - databaseAlignment: 28% (0.28 * dbMatchStrength)
 * - consensusAgreement: 30% (0.30 * consensusStrength)
 * - imageQuality: 14% (0.14 * avgImageQualityScore)
 * - distinctness: 18% (0.18 * (distinctImageCount / max(1, imageCount)))
 * - nameStability: 10% (0.10 * nameStability)
 * 
 * Penalties (subtract points):
 * - 1 image: -6
 * - samePlantLikely: -5
 * - hasDuplicates: -3
 * - distinctImageCount === 1 && imageCount > 1: -6
 * - avgImageQualityScore < 0.45: -4
 * 
 * Caps (ceilings):
 * - 1 image: 82
 * - 2 images: 90
 * - 3+ images: 99
 * - If samePlantLikely (even with 3+): cap at 92 unless consensusStrength > 0.85 AND dbMatchStrength > 0.85, then cap 96
 * 
 * Floor: 55 (for UX stability)
 */
export function computeConfidenceV403(args: {
  imageCount: number;
  distinctImageCount: number;
  hasDuplicates: boolean;
  samePlantLikely: boolean;
  avgImageQualityScore: number; // 0..1
  consensusStrength: number;    // 0..1
  dbMatchStrength: number;      // 0..1
  nameStability: number;        // 0..1
}): ConfidenceBreakdown {
  const {
    imageCount,
    distinctImageCount,
    hasDuplicates,
    samePlantLikely,
    avgImageQualityScore,
    consensusStrength,
    dbMatchStrength,
    nameStability,
  } = args;

  // Normalize inputs to 0..1
  const normDbMatch = clamp01(dbMatchStrength);
  const normConsensus = clamp01(consensusStrength);
  const normQuality = clamp01(avgImageQualityScore);
  const normNameStability = clamp01(nameStability);

  // Calculate distinctness component
  const distinctnessRatio = distinctImageCount / Math.max(1, imageCount);
  const normDistinctness = clamp01(distinctnessRatio);

  // Base components (weighted, 0..100 points total)
  const databaseAlignment = 0.28 * normDbMatch * 100;
  const consensusAgreement = 0.30 * normConsensus * 100;
  const imageQuality = 0.14 * normQuality * 100;
  const distinctness = 0.18 * normDistinctness * 100;
  const nameStabilityComponent = 0.10 * normNameStability * 100;

  const base = databaseAlignment + consensusAgreement + imageQuality + distinctness + nameStabilityComponent;

  // Penalties (subtract points)
  let penalties = 0;
  const penaltyNotes: string[] = [];

  if (imageCount === 1) {
    penalties += 6;
    penaltyNotes.push("Single image penalty: -6");
  }

  if (samePlantLikely) {
    penalties += 5;
    penaltyNotes.push("Same-plant penalty: -5");
  }

  if (hasDuplicates) {
    penalties += 3;
    penaltyNotes.push("Duplicate images penalty: -3");
  }

  if (distinctImageCount === 1 && imageCount > 1) {
    penalties += 6;
    penaltyNotes.push("All images similar penalty: -6");
  }

  if (normQuality < 0.45) {
    penalties += 4;
    penaltyNotes.push("Low image quality penalty: -4");
  }

  const raw = base - penalties;

  // Caps (ceilings)
  let cap: number;
  let capReason: string | undefined;
  let capped = false;

  if (imageCount === 1) {
    cap = 82;
    capReason = "Single image cap: 82%";
  } else if (imageCount === 2) {
    cap = 90;
    capReason = "Two images cap: 90%";
  } else if (imageCount >= 3) {
    if (samePlantLikely) {
      // Same-plant cap: 92 unless high consensus AND high DB match
      if (normConsensus > 0.85 && normDbMatch > 0.85) {
        cap = 96;
        capReason = "Same-plant with high consensus & DB match cap: 96%";
      } else {
        cap = 92;
        capReason = "Same-plant cap: 92%";
      }
    } else {
      cap = 99;
      capReason = "Three+ images cap: 99%";
    }
  } else {
    cap = 99; // Fallback
    capReason = "Default cap: 99%";
  }

  // Apply cap
  let final = Math.min(raw, cap);
  if (final < raw) {
    capped = true;
  }

  // Floor: 55 (for UX stability)
  final = Math.max(55, final);

  // Build notes
  const notes: string[] = [
    `Base: ${base.toFixed(1)} (DB: ${databaseAlignment.toFixed(1)}, Consensus: ${consensusAgreement.toFixed(1)}, Quality: ${imageQuality.toFixed(1)}, Distinctness: ${distinctness.toFixed(1)}, Name Stability: ${nameStabilityComponent.toFixed(1)})`,
    ...penaltyNotes,
    `Raw: ${raw.toFixed(1)}`,
    capped ? `Capped at ${cap}%: ${capReason}` : `No cap applied`,
    `Final: ${final.toFixed(1)}%`,
  ];

  return {
    final: Math.round(final),
    capped,
    capReason: capped ? capReason : undefined,
    components: {
      databaseAlignment: Math.round(databaseAlignment),
      consensusAgreement: Math.round(consensusAgreement),
      imageQuality: Math.round(imageQuality),
      distinctness: Math.round(distinctness),
      nameStability: Math.round(nameStabilityComponent),
      penalties: Math.round(penalties),
    },
    notes,
  };
}
