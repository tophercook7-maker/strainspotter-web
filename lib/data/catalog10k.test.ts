import { describe, expect, it } from "vitest";
import { CATALOG_10K, CATALOG_10K_SIZE, resolveStrain, slugifyName } from "./catalog10k";

describe("catalog10k", () => {
  it("holds 10,000 strains with the curated set included", () => {
    expect(CATALOG_10K_SIZE).toBe(10000);
    for (const famous of ["blue-dream", "og-kush", "gelato", "wedding-cake", "granddaddy-purple", "sour-diesel"]) {
      expect(CATALOG_10K.some((s) => s.slug === famous)).toBe(true);
    }
  });

  it("resolves free-text names to catalog entries", () => {
    expect(resolveStrain("Blue Dream")?.slug).toBe("blue-dream");
    expect(resolveStrain("  OG   Kush ")?.slug).toBe("og-kush");
    expect(resolveStrain("Gelato")?.slug).toBe("gelato");
  });

  it("returns null for unknown strains (so the scanner can stay honest)", () => {
    expect(resolveStrain("Totally Made Up Strain 9000")).toBeNull();
    expect(resolveStrain("")).toBeNull();
    expect(resolveStrain(undefined)).toBeNull();
  });

  it("resolves variant names to a sensible catalog entry", () => {
    // Either an exact variant ("blue-dream-auto") or the stripped base
    // ("blue-dream") — both are correct; just never null for a real variant.
    expect(resolveStrain("Blue Dream Auto")?.slug).toMatch(/^blue-dream/);
  });

  it("slugify is stable and url-safe", () => {
    expect(slugifyName("Girl Scout Cookies!!")).toBe("girl-scout-cookies");
    expect(slugifyName("GG#4")).toBe("gg-4");
  });
});
