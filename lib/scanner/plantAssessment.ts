// lib/scanner/plantAssessment.ts
//
// Normalizer for the Plant Doctor "whole plant" assessment block returned by
// /api/grow-doctor/diagnose (grow-doctor-v2). Kept in lib/ so it's unit-
// testable without touching the API route or spending a Vision call.
//
// Design stance: stage, health, and age-range ARE reliably photo-assessable
// (unlike visual strain ID), so this block is always present in v2 responses —
// the normalizer guarantees a well-formed shape even from partial model JSON.

export type PlantStage =
  | "seedling"
  | "early-veg"
  | "late-veg"
  | "pre-flower"
  | "early-flower"
  | "mid-flower"
  | "late-flower"
  | "harvest-ready"
  | "harvested"
  | "unclear";

export type WeekRange = { min: number; max: number };

export interface PlantAssessment {
  healthScore: number; // 0-100
  vigor: "thriving" | "healthy" | "struggling" | "critical";
  stage: PlantStage;
  estimatedAgeWeeks: WeekRange | null;
  weeksIntoFlower: WeekRange | null;
  estimatedWeeksToHarvest: WeekRange | null;
  trichomes: "clear" | "cloudy" | "mixed" | "amber" | "not-visible";
  morphology: "indica-leaning" | "sativa-leaning" | "balanced" | "unclear";
  morphologyNotes: string;
  healthSummary: string;
}

const STAGES: readonly PlantStage[] = [
  "seedling", "early-veg", "late-veg", "pre-flower", "early-flower",
  "mid-flower", "late-flower", "harvest-ready", "harvested", "unclear",
];
const VIGORS = ["thriving", "healthy", "struggling", "critical"] as const;
const TRICHOMES = ["clear", "cloudy", "mixed", "amber", "not-visible"] as const;
const MORPHOLOGIES = ["indica-leaning", "sativa-leaning", "balanced", "unclear"] as const;

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fb: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fb;
}

function clampInt(v: unknown, min: number, max: number, fb: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Weeks ranges are honest estimates — clamp to sane bounds, fix inversions. */
function normalizeWeekRange(v: unknown, maxWeeks: number): WeekRange | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const min = clampInt(o.min, 0, maxWeeks, -1);
  const max = clampInt(o.max, 0, maxWeeks, -1);
  if (min < 0 || max < 0) return null;
  return min <= max ? { min, max } : { min: max, max: min };
}

/** Derive vigor from the score when the model omits or contradicts it. */
export function vigorForScore(score: number): PlantAssessment["vigor"] {
  if (score >= 90) return "thriving";
  if (score >= 70) return "healthy";
  if (score >= 40) return "struggling";
  return "critical";
}

const FLOWERING_STAGES: readonly PlantStage[] = [
  "pre-flower", "early-flower", "mid-flower", "late-flower", "harvest-ready",
];

export function normalizePlantAssessment(raw: unknown): PlantAssessment {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const healthScore = clampInt(o.healthScore, 0, 100, 50);
  const stage = pickEnum(o.stage, STAGES, "unclear");
  const flowering = FLOWERING_STAGES.includes(stage);

  return {
    healthScore,
    vigor: pickEnum(o.vigor, VIGORS, vigorForScore(healthScore)),
    stage,
    estimatedAgeWeeks: normalizeWeekRange(o.estimatedAgeWeeks, 52),
    // Flower-relative timelines only make sense in a flowering stage — drop
    // them otherwise so the UI never shows "3 weeks to harvest" on a seedling.
    weeksIntoFlower: flowering ? normalizeWeekRange(o.weeksIntoFlower, 20) : null,
    estimatedWeeksToHarvest: flowering
      ? normalizeWeekRange(o.estimatedWeeksToHarvest, 20)
      : null,
    trichomes: pickEnum(o.trichomes, TRICHOMES, "not-visible"),
    morphology: pickEnum(o.morphology, MORPHOLOGIES, "unclear"),
    morphologyNotes:
      typeof o.morphologyNotes === "string" ? o.morphologyNotes.trim().slice(0, 300) : "",
    healthSummary:
      typeof o.healthSummary === "string" ? o.healthSummary.trim().slice(0, 500) : "",
  };
}

/** Human label for a stage key (shared by UI). */
export const STAGE_LABELS: Record<PlantStage, string> = {
  "seedling": "Seedling",
  "early-veg": "Early veg",
  "late-veg": "Late veg",
  "pre-flower": "Pre-flower",
  "early-flower": "Early flower",
  "mid-flower": "Mid flower",
  "late-flower": "Late flower",
  "harvest-ready": "Harvest ready",
  "harvested": "Harvested",
  "unclear": "Stage unclear",
};

export function formatWeekRange(r: WeekRange | null): string | null {
  if (!r) return null;
  return r.min === r.max ? `~${r.min} wk` : `${r.min}–${r.max} wk`;
}
