import { describe, it, expect } from "vitest";
import { matchLabelToCatalog, bestLabelMatch, normalizeLabel } from "./labelMatch";
import { applyLabelMatch } from "@/app/api/scan/route";

describe("matchLabelToCatalog — the label→catalog path (the only route to correct ID)", () => {
  it("exact name", () => {
    const m = matchLabelToCatalog("Blue Dream");
    expect(m?.strain.slug).toBe("blue-dream");
    expect(m?.method).toBe("exact");
  });

  it("known alias/abbreviation (GG4, GSC)", () => {
    expect(matchLabelToCatalog("GG4")?.strain.slug).toBe("gorilla-glue-4");
    expect(matchLabelToCatalog("GSC")?.strain.slug).toBe("girl-scout-cookies");
  });

  it("plural + casing + punctuation", () => {
    expect(matchLabelToCatalog("Blue Dreams")?.strain.slug).toBe("blue-dream");
    expect(matchLabelToCatalog("blue  dream!!")?.strain.slug).toBe("blue-dream");
  });

  it("strain name embedded in a longer label string", () => {
    const m = matchLabelToCatalog("Blue Dream · Sativa · 3.5g · THC 24%");
    expect(m?.strain.slug).toBe("blue-dream");
    expect(m?.method).toBe("contains");
  });

  it("OCR typos resolve via bounded fuzzy", () => {
    expect(matchLabelToCatalog("Blu Dream")?.strain.slug).toBe("blue-dream");
    expect(matchLabelToCatalog("Gorila Glue")?.strain.slug).toBe("gorilla-glue-4");
  });

  it("does NOT hallucinate a match for non-strain / pure-noise text", () => {
    expect(matchLabelToCatalog("Nutrition Facts Serving Size")).toBeNull();
    expect(matchLabelToCatalog("Indica Hybrid THC CBD")).toBeNull();
    expect(matchLabelToCatalog("xyzzy qwerty")).toBeNull();
  });

  it("blocklist: ubiquitous label terms never resolve to a strain", () => {
    for (const term of ["THC", "CBD", "CBG", "BHO", "AKA", "OG", "Kush", "Indica", "Sativa", "Hybrid"]) {
      expect(matchLabelToCatalog(term)).toBeNull();
    }
    // but real names containing those words still resolve
    expect(matchLabelToCatalog("OG Kush")?.strain.slug).toBe("og-kush");
  });

  it("vetted supplemental aliases fill famous strains that had none", () => {
    expect(matchLabelToCatalog("ATF")?.strain.slug).toBe("alaskan-thunder-fuck");
    expect(matchLabelToCatalog("PBB")?.strain.slug).toBe("peanut-butter-breath");
    expect(matchLabelToCatalog("Grandaddy Purple")?.strain.slug).toBe("granddaddy-purple");
  });

  it("compact: spacing destroyed by punctuation-stripping or OCR still resolves", () => {
    // "GG#4" normalizes to "gg 4" which no longer equals the "GG4" alias —
    // the compact path repairs exactly this (very common label format).
    expect(matchLabelToCatalog("GG#4")?.strain.slug).toBe("gorilla-glue-4");
    expect(matchLabelToCatalog("BlueDream")?.strain.slug).toBe("blue-dream");
  });

  it("compact path still refuses blocklisted junk and short fragments", () => {
    expect(matchLabelToCatalog("T H C")).toBeNull();
    expect(matchLabelToCatalog("O G")).toBeNull();
  });

  it("OCR-confusable repair: digit↔letter swaps resolve", () => {
    expect(matchLabelToCatalog("B1ue Dream")?.strain.slug).toBe("blue-dream");
    expect(matchLabelToCatalog("Gelato 4l")?.strain.slug).toBe("gelato-41");
  });

  it("expanded vetted aliases resolve famous shorthand", () => {
    expect(matchLabelToCatalog("GDP")?.strain.slug).toBe("granddaddy-purple");
    expect(matchLabelToCatalog("Sour D")?.strain.slug).toBe("sour-diesel");
    expect(matchLabelToCatalog("MAC")?.strain.slug).toBe("mac-1");
    expect(matchLabelToCatalog("MTF")?.strain.slug).toBe("alaskan-thunder-fuck");
    expect(matchLabelToCatalog("ECSD")?.strain.slug).toBe("east-coast-sour-diesel");
    expect(matchLabelToCatalog("SLH")?.strain.slug).toBe("super-lemon-haze");
    expect(matchLabelToCatalog("Skittlez")?.strain.slug).toBe("zkittlez");
    expect(matchLabelToCatalog("Maui Waui")?.strain.slug).toBe("maui-wowie");
    expect(matchLabelToCatalog("PB Breath")?.strain.slug).toBe("peanut-butter-breath");
  });

  it("abbreviation embedded in a full label resolves via bestLabelMatch windows", () => {
    expect(bestLabelMatch("GG#4 · Hybrid · Net Wt 3.5g · THC 28%", [])?.strain.slug).toBe("gorilla-glue-4");
    expect(bestLabelMatch("GDP INDICA 1g PREROLL", [])?.strain.slug).toBe("granddaddy-purple");
  });

  it("scores exact ≥ normalized ≥ fuzzy (so callers can gate promotion)", () => {
    expect(matchLabelToCatalog("Blue Dream")!.score).toBeGreaterThanOrEqual(
      matchLabelToCatalog("Blu Dream")!.score
    );
  });
});

describe("bestLabelMatch — from full OCR output", () => {
  it("pulls the strain out of a multi-line dispensary label", () => {
    const ocrText = "BLUE DREAM\nSativa-Dominant Hybrid\nTHC 18-24%\nNet Wt 3.5g";
    const m = bestLabelMatch(ocrText, ["Blue Dream"]);
    expect(m?.strain.slug).toBe("blue-dream");
  });

  it("recovers when the model's candidate list is empty but text has the name", () => {
    const m = bestLabelMatch("Green Crack — 1/8 oz — Sativa", []);
    expect(m?.strain.slug).toBe("green-crack");
  });

  it("returns null when the label truly has no known strain", () => {
    expect(bestLabelMatch("Organic Hemp Seed Oil 500mg", [])).toBeNull();
  });
});

describe("applyLabelMatch — /api/scan promotion", () => {
  const scan = (ocr: string, cands: string[], candidates: unknown[]) => ({
    observation: { ocrText: ocr, ocrStrainCandidates: cands },
    candidates,
    summary: { primaryCandidateSlug: null, confidenceTier: "uncertain", headline: "" },
  });

  it("promotes a confident label read to the top candidate with nameInImage=true", () => {
    const out = applyLabelMatch(
      scan("BLUE DREAM\nSativa 3.5g", ["Blue Dream"], [
        { strainName: "Gelato", slug: "gelato", confidence: 60, matchSignals: { nameInImage: false } },
      ])
    );
    const cands = out.candidates as Record<string, unknown>[];
    expect(cands[0].slug).toBe("blue-dream");
    expect((cands[0].matchSignals as Record<string, unknown>).nameInImage).toBe(true);
    expect((out.summary as Record<string, unknown>).primaryCandidateSlug).toBe("blue-dream");
    expect((cands[0].confidence as number)).toBeGreaterThanOrEqual(80);
  });

  it("does nothing when there is no confident label match (unlabeled bud)", () => {
    const input = scan("", [], [
      { strainName: "Gelato", slug: "gelato", confidence: 60, matchSignals: { nameInImage: false } },
    ]);
    const out = applyLabelMatch(input);
    expect((out.candidates as Record<string, unknown>[])[0].slug).toBe("gelato");
    expect(out.labelMatched).toBeUndefined();
  });

  it("merges with (does not duplicate) an existing candidate for the same strain", () => {
    const out = applyLabelMatch(
      scan("Green Crack 1/8", ["Green Crack"], [
        { strainName: "Green Crack", slug: "green-crack", confidence: 55, matchSignals: { nameInImage: false, categoryMatches: true } },
      ])
    );
    const cands = out.candidates as Record<string, unknown>[];
    expect(cands.filter((c) => c.slug === "green-crack").length).toBe(1);
    expect((cands[0].matchSignals as Record<string, unknown>).nameInImage).toBe(true);
  });

  it("garbled label read still SURFACES the catalog strain (promote or soft tier)", () => {
    // Before: a sub-0.9 fuzzy read was dropped entirely, losing the right answer.
    // Now it surfaces — either promoted (≥0.9) or added as a medium soft candidate.
    const out = applyLabelMatch(
      scan("Blu Dream · 3.5g", ["Blu Dream"], [
        { strainName: "Gelato", slug: "gelato", confidence: 55, matchSignals: { nameInImage: false } },
      ])
    );
    const cands = out.candidates as Record<string, unknown>[];
    expect(cands.some((c) => c.slug === "blue-dream")).toBe(true);
  });

  it("soft tier never fakes the high (label) confidence band", () => {
    // Whatever soft candidate gets added must stay medium (<80) and not claim
    // nameInImage — only a clean ≥0.9 read earns the high label band.
    const out = applyLabelMatch(
      scan("Blu Dream · 3.5g", ["Blu Dream"], [
        { strainName: "Gelato", slug: "gelato", confidence: 55, matchSignals: { nameInImage: false } },
      ])
    );
    const cands = out.candidates as Record<string, unknown>[];
    const soft = cands.find((c) => c.slug === "blue-dream" && (c.labelMatch as any)?.soft === true);
    if (soft) {
      expect(soft.confidence as number).toBeLessThan(80);
      expect((soft.matchSignals as Record<string, unknown>).nameInImage).toBe(false);
    }
  });
});

describe("normalizeLabel", () => {
  it("collapses punctuation/case/whitespace", () => {
    expect(normalizeLabel("  Blue--Dream!! ")).toBe("blue dream");
    expect(normalizeLabel("Wedding Cake #5")).toBe("wedding cake 5");
  });
});
