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
