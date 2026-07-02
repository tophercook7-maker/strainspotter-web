import { describe, it, expect } from "vitest";
import { calibrateConfidence, calibratedTier } from "./calibration";
import { applyConfidenceCalibration } from "@/app/api/scan/route";

describe("calibrateConfidence", () => {
  it("collapses the model's inflated mid-range (visual-only) to its true ~low accuracy", () => {
    // The model dumps most scans into 50-79 stated confidence; empirically that
    // band is ~10% top-1. Calibrated output must be far below the raw number.
    for (const raw of [50, 60, 65, 70, 79]) {
      const c = calibrateConfidence(raw, { nameInImage: false });
      expect(c.calibrated).toBeLessThan(30);
      expect(c.raw).toBe(raw);
      expect(c.stratum).toBe("visualOnly");
      expect(c.basis).toBe("fit");
    }
  });

  it("keeps the OCR name-in-image lane genuinely high (declared prior)", () => {
    const c = calibrateConfidence(85, { nameInImage: true });
    expect(c.calibrated).toBeGreaterThanOrEqual(70);
    expect(c.stratum).toBe("nameInImage");
    expect(c.basis).toBe("prior");
  });

  it("rates a name-in-image match above a same-raw visual guess", () => {
    const named = calibrateConfidence(70, { nameInImage: true });
    const visual = calibrateConfidence(70, { nameInImage: false });
    expect(named.calibrated).toBeGreaterThan(visual.calibrated);
  });

  it("is monotone non-decreasing in raw confidence within a stratum", () => {
    let prev = -1;
    for (let raw = 0; raw <= 100; raw += 5) {
      const c = calibrateConfidence(raw, { nameInImage: false }).calibrated;
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it("clamps and tolerates junk input", () => {
    expect(calibrateConfidence(999).calibrated).toBeLessThanOrEqual(100);
    expect(calibrateConfidence(-50).calibrated).toBeGreaterThanOrEqual(0);
    expect(calibrateConfidence(Number.NaN).raw).toBe(0);
  });

  it("maps calibrated values to honest tiers", () => {
    expect(calibratedTier(85)).toBe("high");
    expect(calibratedTier(50)).toBe("moderate");
    expect(calibratedTier(25)).toBe("low");
    expect(calibratedTier(8)).toBe("uncertain");
  });
});

describe("applyConfidenceCalibration (route transform)", () => {
  const sample = () => ({
    candidates: [
      {
        strainName: "Blue Dream",
        slug: "blue-dream",
        confidence: 65,
        matchSignals: { nameInImage: false },
      },
      {
        strainName: "OG Kush",
        slug: "og-kush",
        confidence: 60,
        matchSignals: { nameInImage: true },
      },
    ],
    summary: { confidenceTier: "moderate", primaryCandidateSlug: "blue-dream" },
  });

  it("preserves raw as modelConfidence and rewrites confidence to calibrated", () => {
    const out = applyConfidenceCalibration(sample());
    const cands = out.candidates as Record<string, unknown>[];
    for (const c of cands) {
      expect(c.modelConfidence).toBeTypeOf("number");
      expect(c.confidence).not.toBe(c.modelConfidence);
    }
    expect((out.calibration as Record<string, unknown>).applied).toBe(true);
  });

  it("re-orders so an OCR-label match outranks a higher-raw visual guess", () => {
    const out = applyConfidenceCalibration(sample());
    const cands = out.candidates as Record<string, unknown>[];
    // og-kush had lower raw (60) but is name-in-image → should now be first.
    expect(cands[0].slug).toBe("og-kush");
  });

  it("drops the single-primary pick when nothing clears the moderate bar", () => {
    const visualOnly = {
      candidates: [
        { strainName: "X", slug: "x", confidence: 70, matchSignals: { nameInImage: false } },
      ],
      summary: { confidenceTier: "moderate", primaryCandidateSlug: "x" },
    };
    const out = applyConfidenceCalibration(visualOnly);
    expect((out.summary as Record<string, unknown>).primaryCandidateSlug).toBeNull();
    expect((out.summary as Record<string, unknown>).confidenceTier).toBe("uncertain");
  });
});
