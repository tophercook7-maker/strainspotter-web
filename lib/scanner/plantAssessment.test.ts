import { describe, it, expect } from "vitest";
import {
  normalizePlantAssessment,
  vigorForScore,
  formatWeekRange,
} from "./plantAssessment";

describe("normalizePlantAssessment — grow-doctor-v2 whole-plant read", () => {
  it("passes through a well-formed mid-flower assessment", () => {
    const a = normalizePlantAssessment({
      healthScore: 86,
      vigor: "healthy",
      stage: "mid-flower",
      estimatedAgeWeeks: { min: 9, max: 12 },
      weeksIntoFlower: { min: 4, max: 5 },
      estimatedWeeksToHarvest: { min: 3, max: 5 },
      trichomes: "cloudy",
      morphology: "indica-leaning",
      morphologyNotes: "Wide leaflets, tight internodal spacing.",
      healthSummary: "Vigorous mid-flower plant with healthy bud development.",
    });
    expect(a.healthScore).toBe(86);
    expect(a.stage).toBe("mid-flower");
    expect(a.estimatedAgeWeeks).toEqual({ min: 9, max: 12 });
    expect(a.estimatedWeeksToHarvest).toEqual({ min: 3, max: 5 });
    expect(a.trichomes).toBe("cloudy");
    expect(a.morphology).toBe("indica-leaning");
  });

  it("drops flower timelines for non-flowering stages (no 'weeks to harvest' on a seedling)", () => {
    const a = normalizePlantAssessment({
      healthScore: 92,
      stage: "seedling",
      weeksIntoFlower: { min: 1, max: 2 },
      estimatedWeeksToHarvest: { min: 10, max: 14 },
    });
    expect(a.weeksIntoFlower).toBeNull();
    expect(a.estimatedWeeksToHarvest).toBeNull();
    expect(a.estimatedAgeWeeks).toBeNull(); // not provided
  });

  it("derives vigor from score when the model omits it", () => {
    expect(normalizePlantAssessment({ healthScore: 95 }).vigor).toBe("thriving");
    expect(normalizePlantAssessment({ healthScore: 75 }).vigor).toBe("healthy");
    expect(normalizePlantAssessment({ healthScore: 50 }).vigor).toBe("struggling");
    expect(normalizePlantAssessment({ healthScore: 20 }).vigor).toBe("critical");
  });

  it("survives garbage input with a safe neutral shape", () => {
    const a = normalizePlantAssessment(null);
    expect(a.healthScore).toBe(50);
    expect(a.stage).toBe("unclear");
    expect(a.vigor).toBe("struggling"); // 50 → struggling band, honest neutral
    expect(a.morphology).toBe("unclear");
    expect(a.estimatedAgeWeeks).toBeNull();
  });

  it("clamps out-of-range values and repairs inverted week ranges", () => {
    const a = normalizePlantAssessment({
      healthScore: 250,
      stage: "late-flower",
      estimatedAgeWeeks: { min: 14, max: 10 },
      weeksIntoFlower: { min: -3, max: 8 },
    });
    expect(a.healthScore).toBe(100);
    expect(a.estimatedAgeWeeks).toEqual({ min: 10, max: 14 });
    expect(a.weeksIntoFlower).toEqual({ min: 0, max: 8 });
  });

  it("rejects invalid enums back to safe defaults", () => {
    const a = normalizePlantAssessment({
      healthScore: 80,
      stage: "week-6-of-flower",
      trichomes: "sparkly",
      morphology: "og-kush", // model must never claim a strain here
    });
    expect(a.stage).toBe("unclear");
    expect(a.trichomes).toBe("not-visible");
    expect(a.morphology).toBe("unclear");
  });
});

describe("helpers", () => {
  it("vigorForScore bands", () => {
    expect(vigorForScore(90)).toBe("thriving");
    expect(vigorForScore(89)).toBe("healthy");
    expect(vigorForScore(40)).toBe("struggling");
    expect(vigorForScore(39)).toBe("critical");
  });

  it("formatWeekRange", () => {
    expect(formatWeekRange({ min: 3, max: 5 })).toBe("3–5 wk");
    expect(formatWeekRange({ min: 4, max: 4 })).toBe("~4 wk");
    expect(formatWeekRange(null)).toBeNull();
  });
});
