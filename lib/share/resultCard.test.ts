import { describe, it, expect } from "vitest";
import { buildStrainCardData, buildPlantCardData } from "./resultCard";

describe("buildStrainCardData — honest evidence on the share card", () => {
  it("label-read result leads with the label evidence", () => {
    const d = buildStrainCardData({
      strainName: "Blue Dream",
      confidence: 85,
      confidenceTier: "high",
      hasPrimaryPick: true,
      ocrText: "BLUE DREAM Sativa 3.5g THC 24%",
      nameInImage: true,
    });
    expect(d.title).toBe("Blue Dream");
    expect(d.score).toBe(85);
    expect(d.qualifier).toContain("label");
    expect(d.evidence[0]).toContain("read directly from the label");
    expect(d.evidence.some((e) => e.includes("BLUE DREAM"))).toBe(true);
  });

  it("visual-only result admits the uncertainty (the honesty wedge)", () => {
    const d = buildStrainCardData({
      strainName: "White Widow",
      confidence: 22,
      confidenceTier: "low",
      hasPrimaryPick: false,
      nameInImage: false,
      visualTraitsMatchPercent: 55,
    });
    expect(d.qualifier.toLowerCase()).toContain("low");
    expect(d.evidence.some((e) => e.includes("No label visible"))).toBe(true);
    expect(d.evidence.some((e) => e.includes("55%"))).toBe(true);
  });

  it("clamps score and caps evidence at 4 lines", () => {
    const d = buildStrainCardData({
      strainName: "OG Kush",
      confidence: 250,
      confidenceTier: "high",
      hasPrimaryPick: true,
      nameInImage: true,
      ocrText: "x".repeat(300),
      headline: "y".repeat(200),
      visualTraitsMatchPercent: 80,
    });
    expect(d.score).toBe(100);
    expect(d.evidence.length).toBeLessThanOrEqual(4);
    for (const e of d.evidence) expect(e.length).toBeLessThanOrEqual(90);
  });
});

describe("buildPlantCardData", () => {
  it("healthy flowering plant card", () => {
    const d = buildPlantCardData({
      stageLabel: "Mid flower",
      healthScore: 92,
      vigor: "thriving",
      ageLabel: "9–12 wk",
      harvestLabel: "3–5 wk",
      healthSummary: "Vigorous plant with healthy bud development.",
    });
    expect(d.score).toBe(92);
    expect(d.scoreLabel).toBe("HEALTH");
    expect(d.qualifier).toBe("Thriving plant");
    expect(d.evidence.some((e) => e.includes("9–12 wk"))).toBe(true);
    expect(d.evidence.some((e) => e.includes("No problems"))).toBe(true);
  });

  it("struggling plant shows the top issue instead of 'no problems'", () => {
    const d = buildPlantCardData({
      stageLabel: "Late veg",
      healthScore: 48,
      vigor: "struggling",
      topIssue: "Nitrogen deficiency",
    });
    expect(d.evidence.some((e) => e.includes("Nitrogen deficiency"))).toBe(true);
    expect(d.evidence.some((e) => e.includes("No problems"))).toBe(false);
  });
});
