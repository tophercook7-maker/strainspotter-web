import { describe, it, expect } from "vitest";
import { parseCoa } from "./coaParser";

const get = (arr: any[], name: string) => arr.find((x) => x.name.toLowerCase() === name.toLowerCase());

describe("parseCoa", () => {
  it("standard dispensary panel", () => {
    const r = parseCoa("Blue Dream · Hybrid\nTHC 22.4%  CBD 0.1%\nMyrcene 0.94%  Limonene 0.41%  Caryophyllene 0.33%\nNet Wt 3.5g");
    expect(r).not.toBeNull();
    expect(get(r!.cannabinoids, "THC")?.pct).toBeCloseTo(22.4, 1);
    expect(get(r!.terpenes, "Myrcene")?.pct).toBeCloseTo(0.94, 2);
    expect(get(r!.terpenes, "Limonene")?.pct).toBeCloseTo(0.41, 2);
    // strongest terpene first
    expect(r!.terpenes[0].name).toBe("Myrcene");
  });

  it("Total THC/CBD + total terpenes", () => {
    const r = parseCoa("Total THC: 24.8%   Total CBD: 0.1%   Total Terpenes: 2.1%");
    expect(get(r!.cannabinoids, "Total THC")?.pct).toBeCloseTo(24.8, 1);
    expect(r!.totalTerpenes).toBeCloseTo(2.1, 1);
    // should NOT double-count "THC" from inside "Total THC"
    expect(get(r!.cannabinoids, "THC")).toBeUndefined();
  });

  it("greek prefixes + isomer letters", () => {
    const r = parseCoa("β-Myrcene 0.94%  |  D-Limonene 0.41%  |  β-Caryophyllene 0.33%  |  α-Pinene 0.12%");
    expect(get(r!.terpenes, "Myrcene")?.pct).toBeCloseTo(0.94, 2);
    expect(get(r!.terpenes, "Caryophyllene")?.pct).toBeCloseTo(0.33, 2);
    expect(get(r!.terpenes, "Pinene")?.pct).toBeCloseTo(0.12, 2);
  });

  it("mg/g units convert to %", () => {
    const r = parseCoa("Myrcene 9.4 mg/g   Limonene 4.1 mg/g");
    expect(get(r!.terpenes, "Myrcene")?.pct).toBeCloseTo(0.94, 2);
  });

  it("reversed order (number before name)", () => {
    const r = parseCoa("0.94% Myrcene, 0.41% Limonene");
    expect(get(r!.terpenes, "Myrcene")?.pct).toBeCloseTo(0.94, 2);
  });

  it("names-only list is NOT a measurement", () => {
    expect(parseCoa("Dominant terpenes: Myrcene, Limonene, Caryophyllene")).toBeNull();
  });

  it("junk / no panel → null", () => {
    expect(parseCoa("Organic Hemp Seed Oil 500mg Nutrition Facts")).toBeNull();
    expect(parseCoa("")).toBeNull();
  });
});

describe("parseCoa — real AcreLabs COA (Purple Banner Full Spectrum)", () => {
  // Transcribed as OCR would read the certificate.
  const OCR = `CERTIFICATE OF ANALYSIS  PURPLE BANNER - S443 FULL SPECTRUM
92.8% TOTAL CANNABINOIDS   4.2% TOTAL TERPENES   87.1% TOTAL THC   0.07% TOTAL CBD
CANNABINOID OVERVIEW
THC – 65.96 %   THCA – 24.12 %   CBCA – 0.9 %   CBGA – 0.56 %
TERPENE OVERVIEW
Terpinolene – 0.97%   Limonene – 0.78%   B-myrcene – 0.67%   A-pinene – 0.38%`;
  const r = parseCoa(OCR)!;
  const g = (arr: any[], n: string) => arr.find((x) => x.name.toLowerCase() === n.toLowerCase());

  it("totals (incl. reversed 'X% TOTAL Y')", () => {
    expect(g(r.cannabinoids, "Total THC")?.pct).toBeCloseTo(87.1, 1);
    expect(g(r.cannabinoids, "Total CBD")?.pct).toBeCloseTo(0.07, 2);
    expect(g(r.cannabinoids, "Total Cannabinoids")?.pct).toBeCloseTo(92.8, 1);
    expect(r.totalTerpenes).toBeCloseTo(4.2, 1);
  });
  it("individual cannabinoids (en-dash, concentrate potency)", () => {
    expect(g(r.cannabinoids, "THC")?.pct).toBeCloseTo(65.96, 1);
    expect(g(r.cannabinoids, "THCA")?.pct).toBeCloseTo(24.12, 1);
    expect(g(r.cannabinoids, "CBCA")?.pct).toBeCloseTo(0.9, 2);
    expect(g(r.cannabinoids, "CBGA")?.pct).toBeCloseTo(0.56, 2);
  });
  it("terpenes ranked, with real values", () => {
    expect(g(r.terpenes, "Terpinolene")?.pct).toBeCloseTo(0.97, 2);
    expect(g(r.terpenes, "Limonene")?.pct).toBeCloseTo(0.78, 2);
    expect(g(r.terpenes, "Myrcene")?.pct).toBeCloseTo(0.67, 2);
    expect(g(r.terpenes, "Pinene")?.pct).toBeCloseTo(0.38, 2);
    expect(r.terpenes[0].name).toBe("Terpinolene");
  });
});
