import { describe, expect, it } from "vitest";
import {
  buildScanEntitlements,
  MEMBER_INCLUDED_SCANS_PER_PERIOD,
  PRO_INCLUDED_SCANS_PER_PERIOD,
} from "./scanEntitlements";

// Pro is a CAPPED tier (300/period), not unlimited. These pin the cap so a
// refactor can't silently reopen unlimited scanning (which would be unbounded
// AI cost on a $9.99 plan).
describe("Pro scan cap", () => {
  const base = {
    membership: "pro",
    freeScansUsed: 0,
    topupScansAvailable: 0,
    scanPeriodStartedAt: null,
    scanPeriodEndsAt: null,
  };

  it("includes 300 scans/period and is not unlimited", () => {
    const e = buildScanEntitlements({ ...base, memberScansUsed: 0 });
    expect(PRO_INCLUDED_SCANS_PER_PERIOD).toBe(300);
    expect(e.isUnlimited).toBe(false);
    expect(e.memberScansIncluded).toBe(300);
    expect(e.memberScansRemaining).toBe(300);
    expect(e.canScan).toBe(true);
  });

  it("decrements remaining as usage grows", () => {
    const e = buildScanEntitlements({ ...base, memberScansUsed: 120 });
    expect(e.memberScansRemaining).toBe(180);
    expect(e.canScan).toBe(true);
  });

  it("blocks at the cap when no top-ups remain", () => {
    const e = buildScanEntitlements({ ...base, memberScansUsed: 300 });
    expect(e.memberScansRemaining).toBe(0);
    expect(e.canScan).toBe(false);
  });

  it("falls back to top-ups once the cap is hit", () => {
    const e = buildScanEntitlements({
      ...base,
      memberScansUsed: 300,
      topupScansAvailable: 5,
    });
    expect(e.canScan).toBe(true);
    expect(e.shouldUseTopup).toBe(true);
  });
});

describe("Member cap unchanged", () => {
  it("still includes 75 scans/period", () => {
    const e = buildScanEntitlements({
      membership: "garden",
      freeScansUsed: 0,
      memberScansUsed: 0,
      topupScansAvailable: 0,
      scanPeriodStartedAt: null,
      scanPeriodEndsAt: null,
    });
    expect(e.memberScansIncluded).toBe(MEMBER_INCLUDED_SCANS_PER_PERIOD);
    expect(e.memberScansIncluded).toBe(100);
    expect(e.isUnlimited).toBe(false);
  });
});
