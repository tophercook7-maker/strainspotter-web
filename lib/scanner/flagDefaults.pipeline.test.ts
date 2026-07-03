// Verification for the default-on scanner pipeline: label promotion →
// calibration, exercised end-to-end on realistic scan results (the shapes
// normalizeAnalysis produces), plus FREE_SYSTEM_PROMPT sanity. This is the
// "verify before flipping flags to default" pass from the ROADMAP — the
// deterministic layers need no API spend to verify.
import { describe, it, expect } from "vitest";
import {
  applyLabelMatch,
  applyConfidenceCalibration,
  FREE_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from "@/app/api/scan/route";

/** A realistic normalized scan result (visual-only model guesses + OCR). */
function scanResult(ocrText: string, ocrStrainCandidates: string[] = []) {
  return {
    observation: { ocrText, ocrStrainCandidates },
    candidates: [
      {
        strainName: "White Widow",
        slug: "white-widow",
        confidence: 62,
        matchSignals: { nameInImage: false, categoryMatches: true, visualTraitsMatchPercent: 55, terpeneFamilyMatches: false },
      },
      {
        strainName: "OG Kush",
        slug: "og-kush",
        confidence: 48,
        matchSignals: { nameInImage: false, categoryMatches: true, visualTraitsMatchPercent: 40, terpeneFamilyMatches: false },
      },
    ],
    summary: { headline: "Visual guess", confidenceTier: "moderate", primaryCandidateSlug: "white-widow" },
  } as Record<string, unknown>;
}

function pipeline(result: Record<string, unknown>) {
  return applyConfidenceCalibration(applyLabelMatch(result));
}

describe("default-on pipeline: label promotion → calibration", () => {
  it("real dispensary label → label strain promoted to top with earned high confidence", () => {
    const out = pipeline(scanResult("BLUE DREAM  Sativa  3.5g  THC 24.3%  CBD 0.1%  Batch #A1024", ["Blue Dream"]));
    const cands = out.candidates as Record<string, unknown>[];
    expect((cands[0].slug as string)).toBe("blue-dream");
    const ms = cands[0].matchSignals as Record<string, unknown>;
    expect(ms.nameInImage).toBe(true);
    // calibrated label band is the one place high confidence is earned
    expect(cands[0].confidence as number).toBeGreaterThanOrEqual(40);
    const summary = out.summary as Record<string, unknown>;
    expect(summary.primaryCandidateSlug).toBe("blue-dream");
  });

  it("label with abbreviation (GG#4) resolves and promotes the canonical strain", () => {
    const out = pipeline(scanResult("GG#4 · Hybrid · Net Wt 3.5g · THC 28%"));
    const cands = out.candidates as Record<string, unknown>[];
    expect(cands[0].slug).toBe("gorilla-glue-4");
  });

  it("potency-only label (no strain name) → NO promotion, visual guesses stay demoted to honest confidence", () => {
    const out = pipeline(scanResult("THC 27.4% CBD 0.2% Indica Hybrid Net Wt 3.5g"));
    expect(out.labelMatched).toBeUndefined();
    const cands = out.candidates as Record<string, unknown>[];
    // visual-only stratum: raw 62 must calibrate DOWN (raw kept for audit)
    expect(cands[0].modelConfidence).toBe(62);
    expect(cands[0].confidence as number).toBeLessThan(40);
    // and no false "primary pick" is surfaced
    expect((out.summary as Record<string, unknown>).primaryCandidateSlug).toBeNull();
  });

  it("promoted label match merges with (not duplicates) an existing candidate for the same strain", () => {
    const base = scanResult("OG KUSH  Indica  1g  THC 22%", ["OG Kush"]);
    const out = pipeline(base);
    const cands = out.candidates as Record<string, unknown>[];
    const ogCount = cands.filter((c) => c.slug === "og-kush").length;
    expect(ogCount).toBe(1);
    expect(cands[0].slug).toBe("og-kush");
  });

  it("keeps candidates ordered by calibrated confidence", () => {
    const out = pipeline(scanResult("Gelato 41  Hybrid  THC 26%"));
    const confs = (out.candidates as Record<string, unknown>[]).map((c) => c.confidence as number);
    const sorted = [...confs].sort((a, b) => b - a);
    expect(confs).toEqual(sorted);
  });
});

describe("FREE_SYSTEM_PROMPT (free naming)", () => {
  it("drops the inlined catalog (the ~10k-token block)", () => {
    expect(SYSTEM_PROMPT).toContain("STRAINSPOTTER CATALOG");
    expect(FREE_SYSTEM_PROMPT).not.toContain("STRAINSPOTTER CATALOG");
    expect(FREE_SYSTEM_PROMPT).toContain("NOT limited to a fixed list");
    // sanity: substantially smaller prompt
    expect(FREE_SYSTEM_PROMPT.length).toBeLessThan(SYSTEM_PROMPT.length * 0.7);
  });

  it("keeps the response-format contract intact", () => {
    for (const key of ["ocrText", "candidates", "confidence"]) {
      expect(FREE_SYSTEM_PROMPT).toContain(key);
    }
  });
});
