import { describe, it, expect, beforeEach, vi } from "vitest";

async function load(build?: string) {
  vi.resetModules();
  if (build === undefined) delete process.env.NEXT_PUBLIC_STORE_BUILD;
  else process.env.NEXT_PUBLIC_STORE_BUILD = build;
  return import("./storeCompliance");
}

describe("storeCompliance", () => {
  beforeEach(() => vi.resetModules());

  it("web (default) shows everything", async () => {
    const m = await load(undefined);
    expect(m.STORE_BUILD).toBe("web");
    expect(m.isNativeStore).toBe(false);
    expect(m.compliance.dispensaryFinder).toBe(true);
    expect(m.compliance.seedVendors).toBe(true);
    expect(m.compliance.consumptionDiary).toBe(true);
    expect(m.compliance.webPayments).toBe(true);
  });

  it("ios build hides policy-sensitive surfaces", async () => {
    const m = await load("ios");
    expect(m.STORE_BUILD).toBe("ios");
    expect(m.isNativeStore).toBe(true);
    expect(m.compliance.dispensaryFinder).toBe(false);
    expect(m.compliance.seedVendors).toBe(false);
    expect(m.compliance.consumptionDiary).toBe(false);
    expect(m.compliance.webPayments).toBe(false);
  });

  it("android behaves like ios; junk values fall back to web", async () => {
    expect((await load("android")).isNativeStore).toBe(true);
    expect((await load("garbage")).STORE_BUILD).toBe("web");
  });
});
