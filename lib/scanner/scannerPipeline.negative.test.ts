import { describe, it, expect, vi } from "vitest";
import {
  stripRankedMatchesIfUnusable,
  isUsableVisualSignal,
  shouldRunEmbeddingRetrieval,
  clampLegacyIdentityConfidenceWhenUnusable,
} from "@/lib/scanner/scanAnalysisSignals";
import { retrieveEmbeddingsIfEligible } from "@/lib/scanner/retrieveEmbeddingsIfEligible";
import { isBelowHighConfidenceDisplayTier } from "@/lib/scanner/scanUiConfidence";

function mockGptNegativeAnalysis(kind: "wall" | "hand" | "blur"): Record<string, unknown> {
  const base = {
    imageSignals: {
      usableVisualSignal: false,
      blurOrDarkness: kind === "blur" ? "high" : "medium",
    },
    rankedMatches: [
      {
        strainName: "Fake Strain — should be stripped",
        reasons: ["hallucination"],
        scoreBuckets: { visualFlower: 40, structure: 10, ocr: 0, secondary: 10 },
      },
    ],
    identity: { strainName: "Also Fake", confidence: 92, alternateMatches: [] },
  };
  if (kind === "wall") {
    return {
      ...base,
      plantAnalysis: { health: { label: "Poor image quality for health analysis" } },
    };
  }
  if (kind === "hand") {
    return {
      ...base,
      plantAnalysis: { health: { label: "No cannabis subject detected" } },
    };
  }
  return {
    ...base,
    imageSignals: { ...base.imageSignals as object, blurOrDarkness: "high" },
  };
}

describe("scanner negative pipeline (wall / hand / blur proxies)", () => {
  const scenarios = [
    { kind: "wall" as const, label: "interior wall proxy" },
    { kind: "hand" as const, label: "hand / non-plant proxy" },
    { kind: "blur" as const, label: "extreme blur / dark proxy" },
  ];

  for (const { kind, label } of scenarios) {
    it(`strips ranked matches and blocks embeddings — ${label}`, async () => {
      const analysis = mockGptNegativeAnalysis(kind);
      expect(isUsableVisualSignal(analysis)).toBe(false);

      stripRankedMatchesIfUnusable(analysis);
      expect(Array.isArray(analysis.rankedMatches)).toBe(true);
      expect((analysis.rankedMatches as unknown[]).length).toBe(0);

      const usable = isUsableVisualSignal(analysis);
      expect(shouldRunEmbeddingRetrieval(usable, 3)).toBe(false);

      const runner = vi.fn(async () => ({
        candidates: [{ strainName: "ShouldNotRun", score: 0.99, source: "embedding" as const, reasons: [] }],
        embeddingImageCount: 3,
        embeddingTopStrainMultiImageReinforced: true,
      }));

      const out = await retrieveEmbeddingsIfEligible(usable, ["data:image/jpeg;base64,xx"], runner);
      expect(runner).not.toHaveBeenCalled();
      expect(out.candidates).toEqual([]);
      expect(out.embeddingImageCount).toBe(0);
    });

    it(`legacy unusable confidence stays below high-confidence UI tier — ${label}`, () => {
      const capped = clampLegacyIdentityConfidenceWhenUnusable(95);
      expect(isBelowHighConfidenceDisplayTier(capped)).toBe(true);
      expect(capped).toBeLessThanOrEqual(12);
    });
  }
});
