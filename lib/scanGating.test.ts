import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canScan,
  FREE_SCAN_TOTAL,
  getLocalTier,
  getScansRemaining,
  getScanUsage,
  isSubscribed,
  MEMBERSHIP_TIERS,
  setLocalTier,
  shouldShowWarning,
  TOPUP_PACKS,
} from "./scanGating";

// vitest runs in node-env, so localStorage/window don't exist. Stub a minimal
// in-memory implementation so we exercise the real gating logic, not a no-op.
function installBrowserGlobals() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal("window", {} as unknown as Window);
  vi.stubGlobal("localStorage", localStorageMock);
}

describe("scanGating — tier persistence", () => {
  beforeEach(() => installBrowserGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("returns null when no tier is stored", () => {
    expect(getLocalTier()).toBeNull();
    expect(isSubscribed()).toBe(false);
  });

  it("round-trips member and pro tiers", () => {
    setLocalTier("member");
    expect(getLocalTier()).toBe("member");
    setLocalTier("pro");
    expect(getLocalTier()).toBe("pro");
  });

  it("clears the tier when set to null", () => {
    setLocalTier("pro");
    setLocalTier(null);
    expect(getLocalTier()).toBeNull();
    expect(isSubscribed()).toBe(false);
  });

  it("ignores a corrupt/unknown stored value", () => {
    localStorage.setItem("ss_local_tier", "enterprise");
    expect(getLocalTier()).toBeNull();
  });
});

describe("scanGating — the gate (no-free-tier pivot)", () => {
  beforeEach(() => installBrowserGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("blocks scanning without a subscription", () => {
    expect(canScan()).toBe(false);
    expect(shouldShowWarning()).toBe("empty");
  });

  it("allows scanning (client-optimistic) once subscribed", () => {
    setLocalTier("member");
    expect(canScan()).toBe(true);
    expect(shouldShowWarning()).toBe("none");
  });

  it("never grants free scans, even when subscribed", () => {
    expect(FREE_SCAN_TOTAL).toBe(0);
    expect(getScansRemaining()).toBe(0);
    setLocalTier("pro");
    expect(getScansRemaining()).toBe(0); // accounting is server-side
    expect(getScanUsage()).toEqual({ totalUsed: 0, firstScanAt: null, lastScanAt: null });
  });
});

describe("scanGating — SSR safety", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null on the server (no window) without throwing", () => {
    // No browser globals installed → typeof window === 'undefined'.
    expect(getLocalTier()).toBeNull();
    expect(isSubscribed()).toBe(false);
    expect(canScan()).toBe(false);
  });
});

describe("scanGating — pricing integrity (guards accidental edits)", () => {
  it("top-up per-scan price matches price ÷ scans", () => {
    for (const pack of TOPUP_PACKS) {
      const dollars = Number(pack.price.replace("$", ""));
      expect(dollars / pack.scans).toBeCloseTo(pack.perScan, 3);
    }
  });

  it("keeps the Founder scarcity lever and lifetime framing", () => {
    expect(MEMBERSHIP_TIERS.founder_lifetime.period).toBe("lifetime");
    expect(MEMBERSHIP_TIERS.founder_lifetime.badge).toMatch(/1,000/);
  });

  it("exposes monthly + annual for both member and pro", () => {
    expect(MEMBERSHIP_TIERS.member.period).toBe("monthly");
    expect(MEMBERSHIP_TIERS.member_annual.period).toBe("yearly");
    expect(MEMBERSHIP_TIERS.pro.period).toBe("monthly");
    expect(MEMBERSHIP_TIERS.pro_annual.period).toBe("yearly");
  });
});
