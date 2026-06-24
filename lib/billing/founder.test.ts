import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOUNDER_CAP, countFoundersSold, founderRemaining, isFounderSoldOut } from "./founder";

function stubCount(total: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 206, headers: { "content-range": `0-0/${total}` } })),
  );
}

describe("founderRemaining", () => {
  it("counts down from the cap and never goes negative", () => {
    expect(founderRemaining(0)).toBe(FOUNDER_CAP);
    expect(founderRemaining(999)).toBe(1);
    expect(founderRemaining(1000)).toBe(0);
    expect(founderRemaining(1001)).toBe(0);
  });
});

describe("isFounderSoldOut (cap enforcement)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is false below the cap", async () => {
    stubCount(999);
    expect(await isFounderSoldOut()).toBe(false);
    expect(await countFoundersSold()).toBe(999);
  });

  it("is true at and beyond the cap", async () => {
    stubCount(1000);
    expect(await isFounderSoldOut()).toBe(true);
    stubCount(1001);
    expect(await isFounderSoldOut()).toBe(true);
  });

  it("throws when Supabase isn't configured (checkout then fails closed)", async () => {
    vi.unstubAllEnvs();
    await expect(countFoundersSold()).rejects.toThrow(/not configured/i);
  });
});
