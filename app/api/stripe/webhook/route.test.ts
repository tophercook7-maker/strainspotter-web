import { describe, expect, it } from "vitest";
import { membershipFromPriceId, membershipFromPriceKey, isTopupPriceKey, isDuplicateKeyError } from "./route";
import { membershipToTier } from "@/lib/billing/membership";
import { STRIPE_PRICES } from "@/lib/stripe/config";

// Idempotency claim depends on correctly recognizing a unique-violation so a
// concurrent redelivery is classified "duplicate" (skip) not "unrecorded"
// (fail-open reprocess). Misclassifying a dup as unrecorded → double-apply.
describe("isDuplicateKeyError (idempotency claim classification)", () => {
  it("recognizes Postgres/PostgREST duplicate-key errors", () => {
    expect(isDuplicateKeyError('duplicate key value violates unique constraint "stripe_webhook_events_pkey"')).toBe(true);
    expect(isDuplicateKeyError("Key (event_id)=(evt_1) already exists.")).toBe(true);
    expect(isDuplicateKeyError("23505")).toBe(true);
  });
  it("does not treat unrelated errors as duplicates (those must fail-open)", () => {
    expect(isDuplicateKeyError("connection timeout")).toBe(false);
    expect(isDuplicateKeyError("permission denied for table")).toBe(false);
    expect(isDuplicateKeyError(undefined)).toBe(false);
  });
});

// These mappers decide which plan a Stripe payment grants. A wrong mapping =
// a paying customer gets the wrong tier (or none), so pin every case.
describe("membershipFromPriceKey (checkout metadata → DB membership)", () => {
  it("maps member to garden", () => {
    expect(membershipFromPriceKey("member")).toBe("garden");
  });
  it("maps pro to pro", () => {
    expect(membershipFromPriceKey("pro")).toBe("pro");
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
    expect(isTopupPriceKey("topup_20")).toBe(true);
    expect(isTopupPriceKey("topup_50")).toBe(true);
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
  });
});

describe("purchase → gate tier (end-to-end mapping)", () => {
  it("a paid checkout collapses to the correct paywall tier", () => {
    expect(membershipToTier(membershipFromPriceKey("member"))).toBe("member");
    expect(membershipToTier(membershipFromPriceKey("pro"))).toBe("pro");
  });
});
