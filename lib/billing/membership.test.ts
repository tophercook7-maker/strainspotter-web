import { describe, expect, it } from "vitest";
import { isMembership, membershipToTier, VALID_MEMBERSHIPS } from "./membership";

// This is the single source of truth for tier collapse. It previously drifted
// across webhooks/serverGate/AuthProvider and caused paid users to be denied,
// so pin every mapping.
describe("membershipToTier", () => {
  it("maps pro and elite (Founder) to pro", () => {
    expect(membershipToTier("pro")).toBe("pro");
    expect(membershipToTier("elite")).toBe("pro");
  });

  it("maps garden/standard/legacy-member to member", () => {
    expect(membershipToTier("garden")).toBe("member");
    expect(membershipToTier("standard")).toBe("member");
    expect(membershipToTier("member")).toBe("member");
  });

  it("treats free, null, undefined, and unknown strings as free", () => {
    expect(membershipToTier("free")).toBe("free");
    expect(membershipToTier(null)).toBe("free");
    expect(membershipToTier(undefined)).toBe("free");
    expect(membershipToTier("enterprise")).toBe("free");
    expect(membershipToTier("")).toBe("free");
  });
});

describe("isMembership", () => {
  it("accepts exactly the DB-valid CHECK values", () => {
    for (const m of VALID_MEMBERSHIPS) expect(isMembership(m)).toBe(true);
    expect(VALID_MEMBERSHIPS).toEqual(["free", "garden", "standard", "pro", "elite"]);
  });

  it("rejects the legacy 'member' literal and non-strings", () => {
    // 'member' collapses to the member tier but is NOT a valid DB value.
    expect(isMembership("member")).toBe(false);
    expect(isMembership(null)).toBe(false);
    expect(isMembership(undefined)).toBe(false);
    expect(isMembership(42)).toBe(false);
    expect(isMembership("pro ")).toBe(false);
  });
});
