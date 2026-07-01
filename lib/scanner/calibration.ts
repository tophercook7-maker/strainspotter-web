// lib/scanner/calibration.ts
//
// Turn the scanner's raw GPT-4o self-confidence (0-100) into an HONEST estimate
// of P(this candidate is the correct strain) x 100.
//
// Why this exists: the raw number is badly miscalibrated. On the baseline eval
// the model reports ~60 on average whether it is right or wrong, dumping ~90% of
// scans into a 50-79 "moderate" band whose actual top-1 accuracy is ~10%. A user
// reading "65% confident" is being misled. Calibration is the core of the
// "honesty brand" moat (see ROADMAP Phase 1 + docs/scanner-calibration.md).
//
// Approach (evidence-anchored + structured signals):
//   • Two strata, chosen by the strongest real discriminator in the data —
//     whether OCR read a strain name off the image (matchSignals.nameInImage):
//       - visualOnly: fit from eval evidence (Bayesian-shrunk empirical accuracy
//         + PAVA monotone pooling). Collapses the inflated mid-range to reality.
//       - nameInImage: a conservative declared PRIOR (dispensary/seed-bank labels
//         are reliable) until the flywheel yields labeled OCR cases.
//   • The table is a versioned, auditable JSON refit by
//     scripts/fit-confidence-calibration.mjs — not hard-coded magic numbers.
//
// This module is pure and deterministic; it never calls a model.

import table from "@/data/scanner/calibration.json";

export interface CalibrationSignals {
  /** OCR read a plausible strain name in the image (the reliable high lane). */
  nameInImage?: boolean;
}

export type ConfidenceTier = "high" | "moderate" | "low" | "uncertain";
export type CalibrationBasis = "fit" | "prior";

export interface CalibratedConfidence {
  /** Honest 0-100 estimate of P(correct). What the UI should show. */
  calibrated: number;
  /** The model's original self-reported number, preserved for audit/eval. */
  raw: number;
  tier: ConfidenceTier;
  /** Which stratum was applied. */
  stratum: "visualOnly" | "nameInImage";
  /** Whether that stratum is fit from evidence or a declared prior. */
  basis: CalibrationBasis;
}

interface Bin {
  rawMin: number;
  rawMax: number;
  calibrated: number;
}
interface Stratum {
  source?: string;
  bins: Bin[];
}
interface Table {
  strata: { visualOnly: Stratum; nameInImage: Stratum };
  tierThresholds: { high: number; moderate: number; low: number };
}

const TABLE = table as unknown as Table;

// Deterministic fallback used only if the bundled table is somehow malformed.
// Conservative: mid-range visual guesses read as low, OCR cases as moderate-high.
const FALLBACK: Table = {
  strata: {
    visualOnly: {
      bins: [
        { rawMin: 0, rawMax: 79, calibrated: 8 },
        { rawMin: 80, rawMax: 100, calibrated: 35 },
      ],
    },
    nameInImage: {
      source: "prior",
      bins: [
        { rawMin: 0, rawMax: 59, calibrated: 55 },
        { rawMin: 60, rawMax: 79, calibrated: 70 },
        { rawMin: 80, rawMax: 100, calibrated: 85 },
      ],
    },
  },
  tierThresholds: { high: 70, moderate: 40, low: 20 },
};

function activeTable(): Table {
  const t = TABLE;
  const ok =
    t &&
    t.strata &&
    Array.isArray(t.strata.visualOnly?.bins) &&
    t.strata.visualOnly.bins.length > 0 &&
    Array.isArray(t.strata.nameInImage?.bins) &&
    t.strata.nameInImage.bins.length > 0 &&
    t.tierThresholds;
  return ok ? t : FALLBACK;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function binFor(raw: number, bins: Bin[]): Bin {
  const r = clamp(raw, 0, 100);
  for (const b of bins) {
    if (r >= b.rawMin && r <= b.rawMax) return b;
  }
  // raw sits outside every bin (shouldn't happen with a well-formed table) —
  // fall back to the nearest edge bin so output stays monotone and bounded.
  return r < bins[0].rawMin ? bins[0] : bins[bins.length - 1];
}

function tierFor(calibrated: number, th: Table["tierThresholds"]): ConfidenceTier {
  if (calibrated >= th.high) return "high";
  if (calibrated >= th.moderate) return "moderate";
  if (calibrated >= th.low) return "low";
  return "uncertain";
}

/**
 * Calibrate one candidate's confidence. Pure — safe to call per-candidate.
 */
export function calibrateConfidence(
  rawConfidence: number,
  signals: CalibrationSignals = {}
): CalibratedConfidence {
  const t = activeTable();
  const raw = Number.isFinite(rawConfidence) ? clamp(Math.round(rawConfidence), 0, 100) : 0;
  const useName = signals.nameInImage === true;
  const stratumKey = useName ? "nameInImage" : "visualOnly";
  const stratum = t.strata[stratumKey];
  const bin = binFor(raw, stratum.bins);
  const calibrated = clamp(Math.round(bin.calibrated), 0, 100);
  return {
    calibrated,
    raw,
    tier: tierFor(calibrated, t.tierThresholds),
    stratum: stratumKey,
    basis: stratum.source === "prior" ? "prior" : "fit",
  };
}

/** Tier from an already-calibrated 0-100 value (single source for UI/tests). */
export function calibratedTier(calibrated: number): ConfidenceTier {
  return tierFor(clamp(calibrated, 0, 100), activeTable().tierThresholds);
}
