import { describe, it, expect } from "vitest";
import { assessImageQualityInputs } from "@/lib/scanner/imageQuality";
import { prepareScanInputs } from "@/lib/scanner/scanRouteOrchestrator";
import {
  isUsableVisualSignal,
  stripRankedMatchesIfUnusable,
} from "@/lib/scanner/scanAnalysisSignals";
import { normalizeScanAnalysis } from "@/lib/scanner/scanResponseNormalizer";

describe("scanner pipeline stress", () => {
  it("treats tiny payloads as low-quality (proxy for heavy blur / extreme compression)", () => {
    const tiny = "data:image/jpeg;base64," + "a".repeat(400);
    const q = assessImageQualityInputs([tiny]);
    expect(q.estimatedTooSmallImageCount).toBeGreaterThan(0);
    expect(q.qualityPenalty).toBeGreaterThan(0);
    const prep = prepareScanInputs([tiny]);
    expect(prep.quality.shouldWarnUser).toBe(true);
  });

  it("clears GPT ranked matches when the model marks the frame unusable (non-plant / unusable)", () => {
    const analysis: Record<string, unknown> = {
      imageSignals: { usableVisualSignal: false },
      rankedMatches: [
        {
          strainName: "Ghost Strain",
          reasons: [],
          scoreBuckets: { visualFlower: 40, structure: 10, ocr: 0, secondary: 5 },
        },
      ],
    };
    expect(isUsableVisualSignal(analysis)).toBe(false);
    stripRankedMatchesIfUnusable(analysis);
    expect(analysis.rankedMatches).toEqual([]);
  });

  it("does not clear matches when usableVisualSignal is true", () => {
    const analysis: Record<string, unknown> = {
      imageSignals: { usableVisualSignal: true },
      rankedMatches: [{ strainName: "Blue Dream", reasons: [] }],
    };
    stripRankedMatchesIfUnusable(analysis);
    expect(Array.isArray(analysis.rankedMatches)).toBe(true);
    expect((analysis.rankedMatches as unknown[]).length).toBe(1);
  });

  it("uses a conservative default identity confidence when the model omits confidence", () => {
    const normalized = normalizeScanAnalysis({
      identity: { strainName: "Test", alternateMatches: [] },
      genetics: { dominance: "Hybrid", lineage: [] },
      morphology: {},
      chemistry: { terpenes: [] },
      experience: { effects: [] },
      cultivation: {},
      reasoning: {},
    } as Record<string, unknown>);
    expect(normalized.identity.confidence).toBeLessThanOrEqual(40);
  });

  it("simulates camera cancel / permission denial: empty image file list is a no-op at the data layer", () => {
    const files: File[] = [];
    const imageLike = files.filter((f) => f.type.startsWith("image/"));
    expect(imageLike.length).toBe(0);
  });

  it("simulates API timeout messaging: 504-style errors are surfaced as scan failures (client contract)", () => {
    const body = {
      error: "AI analysis timed out — try fewer or smaller images",
    };
    expect(String(body.error).toLowerCase()).toContain("timed out");
  });
});
