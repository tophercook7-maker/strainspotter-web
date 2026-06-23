import { describe, expect, it } from "vitest";
import { membershipFromPriceId, membershipFromPriceKey, isTopupPriceKey } from "./route";
import { membershipToTier } from "@/lib/billing/membership";
import { STRIPE_PRICES } from "@/lib/stripe/config";

// These mappers decide which plan a Stripe payment grants. A wrong mapping =
// a paying customer gets the wrong tier (or none), so pin every case.
describe("membershipFromPriceKey (checkout metadata → DB membership)", () => {
  it("maps member/annual to garden", () => {
    expect(membershipFromPriceKey("member")).toBe("garden");
    expect(membershipFromPriceKey("member_annual")).toBe("garden");
  });
  it("maps pro/annual to pro", () => {
    expect(membershipFromPriceKey("pro")).toBe("pro");
    expect(membershipFromPriceKey("pro_annual")).toBe("pro");
  });
  it("maps founder_lifetime to elite", () => {
    expect(membershipFromPriceKey("founder_lifetime")).toBe("elite");
  });
  it("returns null for top-ups and unknown/undefined keys", () => {
    expect(membershipFromPriceKey("topup_10")).toBeNull();
    expect(membershipFromPriceKey("bogus")).toBeNull();
    expect(membershipFromPriceKey(undefined)).toBeNull();
  });
});

describe("isTopupPriceKey", () => {
  it("is true only for the three top-up SKUs", () => {
    expect(isTopupPriceKey("topup_10")).toBe(true);
    expect(isTopupPriceKey("topup_25")).toBe(true);
    expect(isTopupPriceKey("topup_100")).toBe(true);
  });
  it("is false for subscriptions and unknowns", () => {
    expect(isTopupPriceKey("pro")).toBe(false);
    expect(isTopupPriceKey("member")).toBe(false);
    expect(isTopupPriceKey(undefined)).toBe(false);
  });
});

describe("membershipFromPriceId (portal upgrades/renewals → membership)", () => {
  it("returns null for missing/unknown price ids", () => {
    expect(membershipFromPriceId(undefined)).toBeNull();
    expect(membershipFromPriceId("price_not_in_config")).toBeNull();
  });
  it("maps configured price ids to the right tier (when configured)", () => {
    // Guarded so this stays green while Stripe price IDs are still placeholders
    // (Phase 3 fills them in). When set, the mapping must be correct.
    if (STRIPE_PRICES.pro) expect(membershipFromPriceId(STRIPE_PRICES.pro)).toBe("pro");
    if (STRIPE_PRICES.member) expect(membershipFromPriceId(STRIPE_PRICES.member)).toBe("garden");
    if (STRIPE_PRICES.founder_lifetime)
      expect(membershipFromPriceId(STRIPE_PRICES.founder_lifetime)).toBe("elite");
  });
});

describe("purchase → gate tier (end-to-end mapping)", () => {
  it("a paid checkout collapses to the correct paywall tier", () => {
    expect(membershipToTier(membershipFromPriceKey("member"))).toBe("member");
    expect(membershipToTier(membershipFromPriceKey("pro"))).toBe("pro");
    expect(membershipToTier(membershipFromPriceKey("founder_lifetime"))).toBe("pro"); // elite → pro gate
  });
});
