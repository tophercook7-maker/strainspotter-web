import { describe, it, expect } from "vitest";
import { getTerpeneInfo, normalizeTerpene } from "./terpenes";

describe("terpene education KB", () => {
  it("resolves core terpenes", () => {
    expect(getTerpeneInfo("Myrcene")?.name).toBe("Myrcene");
    expect(getTerpeneInfo("Limonene")?.name).toBe("Limonene");
    expect(getTerpeneInfo("Pinene")?.name).toBe("Pinene");
  });
  it("folds greek/prefix spellings", () => {
    expect(getTerpeneInfo("β-Caryophyllene")?.name).toBe("Caryophyllene");
    expect(getTerpeneInfo("beta caryophyllene")?.name).toBe("Caryophyllene");
    expect(getTerpeneInfo("d-Limonene")?.name).toBe("Limonene");
    expect(getTerpeneInfo("alpha-Pinene")?.name).toBe("Pinene");
  });
  it("returns null for unknown / non-terpene text", () => {
    expect(getTerpeneInfo("Definitely Not A Terpene")).toBeNull();
    expect(normalizeTerpene("β-Caryophyllene")).toBe("caryophyllene");
  });
});
