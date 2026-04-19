// lib/scanGating.ts — Lifetime scan tracking for free users
// Free users get 5 scans TOTAL (not monthly). Then must subscribe or buy top-ups.

const SCAN_KEY = "ss_scan_usage_v2";

export interface ScanUsage {
  totalUsed: number;
  firstScanAt: string | null;
  lastScanAt: string | null;
}

const FREE_SCAN_LIMIT = 5;

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

export function canScan(): boolean {
  return getScansRemaining() > 0;
}

export function consumeScan(): ScanUsage {
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

export function shouldShowWarning(): "none" | "low" | "last" | "empty" {
  const remaining = getScansRemaining();
  if (remaining === 0) return "empty";
  if (remaining === 1) return "last";
  if (remaining === 2) return "low";
  return "none";
}

export const FREE_SCAN_TOTAL = FREE_SCAN_LIMIT;

export const MEMBERSHIP_TIERS = {
  free: {
    name: "Free",
    price: "$0",
    scans: `${FREE_SCAN_LIMIT} lifetime`,
    features: ["AI Scanner (limited)", "Strain Database (preview)"],
  },
  member: {
    name: "Member",
    price: "$4.99/mo",
    scans: "100 scans/mo",
    features: [
      "AI Scanner — 100 scans/month",
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
    scans: "500 scans/mo",
    features: [
      "Everything in Member",
      "500 scans/month",
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
