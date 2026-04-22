// Scan gating: anonymous users use localStorage; logged-in users use /api/scans/* (server truth).

import { apiUrl } from "@/lib/config/apiBase";
import type { ScanEntitlements } from "@/lib/scanner/scanEntitlements";

const SCAN_KEY = "ss_scan_usage_v2";

export interface ScanUsage {
  totalUsed: number;
  firstScanAt: string | null;
  lastScanAt: string | null;
}

/** Lifetime free trial for anonymous / not-yet-synced clients */
const FREE_SCAN_LIMIT = 3;

export function getScanUsage(): ScanUsage {
  if (typeof window === "undefined") {
    return { totalUsed: 0, firstScanAt: null, lastScanAt: null };
  }
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    if (!raw) return { totalUsed: 0, firstScanAt: null, lastScanAt: null };
    return JSON.parse(raw);
  } catch {
    return { totalUsed: 0, firstScanAt: null, lastScanAt: null };
  }
}

export function getScansRemaining(): number {
  const usage = getScanUsage();
  return Math.max(0, FREE_SCAN_LIMIT - usage.totalUsed);
}

export function canScanAnonymousLocal(): boolean {
  return getScansRemaining() > 0;
}

/** Persist one anonymous scan (localStorage only). */
export function bumpAnonymousScanUsage(): ScanUsage {
  const usage = getScanUsage();
  const now = new Date().toISOString();
  const updated: ScanUsage = {
    totalUsed: usage.totalUsed + 1,
    firstScanAt: usage.firstScanAt || now,
    lastScanAt: now,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SCAN_KEY, JSON.stringify(updated));
  }
  return updated;
}

/** @deprecated Use bumpAnonymousScanUsage — alias for older call sites */
export const consumeScan = bumpAnonymousScanUsage;

export function canScan(): boolean {
  return canScanAnonymousLocal();
}

export function shouldShowWarning(): "none" | "low" | "last" | "empty" {
  const remaining = getScansRemaining();
  if (remaining === 0) return "empty";
  if (remaining === 1) return "last";
  if (remaining === 2) return "low";
  return "none";
}

export const FREE_SCAN_TOTAL = FREE_SCAN_LIMIT;

export async function fetchScanEntitlements(
  accessToken: string
): Promise<{ ok: true; entitlements: ScanEntitlements } | { ok: false; error: string }> {
  const res = await fetch(apiUrl("/api/scans/entitlements"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    entitlements?: ScanEntitlements;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.entitlements) {
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  }
  return { ok: true, entitlements: data.entitlements };
}

export async function postConsumeScan(accessToken: string): Promise<
  | {
      ok: true;
      entitlements: ScanEntitlements;
      consumedFrom: string;
    }
  | { ok: false; error: string; status?: number }
> {
  const res = await fetch(apiUrl("/api/scans/consume"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    entitlements?: ScanEntitlements;
    consumedFrom?: string;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.entitlements) {
    return {
      ok: false,
      error: data.error || `HTTP ${res.status}`,
      status: res.status,
    };
  }
  return {
    ok: true,
    entitlements: data.entitlements,
    consumedFrom: data.consumedFrom ?? "unknown",
  };
}

export const MEMBERSHIP_TIERS = {
  free: {
    name: "Free",
    price: "$0",
    scans: `${FREE_SCAN_LIMIT} free scans total`,
    features: ["AI Scanner (limited)", "Strain Database (preview)"],
  },
  member: {
    name: "Member",
    price: "$4.99/mo",
    scans: "75 scans per billing period",
    features: [
      "AI Scanner — 75 scans / billing period",
      "Full Strain Database",
      "Dispensary Finder",
      "Seed Vendor Directory",
      "Grow Coach — seed to harvest",
      "Scan History & Favorites",
      "Strain Ecosystem Explorer",
    ],
  },
  pro: {
    name: "Pro",
    price: "$9.99/mo",
    scans: "Unlimited scans",
    features: [
      "Everything in Member",
      "Unlimited scans",
      "Advanced Analytics",
      "Lab Data Access",
      "Priority scan processing",
      "Early access to new features",
    ],
  },
} as const;

export const TOPUP_PACKS = [
  { id: "topup_10", scans: 10, price: "$1.99" },
  { id: "topup_25", scans: 25, price: "$3.99" },
] as const;
