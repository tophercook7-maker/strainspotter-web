/**
 * Client-side Grow Log + scan continuity (localStorage).
 * Supabase scan history remains separate; this ties the unified scan UX together offline-first.
 */

import type {
  GrowCoachPayload,
  PlantAnalysisPayload,
  RankedMatchRow,
  UnifiedScanSummary,
} from "@/lib/scanner/rankedScanTypes";

const LOG_KEY = "ss_grow_log_entries_v1";
const CHAIN_KEY = "ss_scan_chain_v1";
const DRAFT_KEY = "ss_grow_log_compose_draft_v1";

export type ClientScanSnapshot = {
  id: string;
  capturedAt: string;
  imageCount: number;
  summary: UnifiedScanSummary;
  matches: RankedMatchRow[];
  plantAnalysis: PlantAnalysisPayload;
  growCoach: GrowCoachPayload;
  /** Compressed data URLs from last save flow — optional */
  imageDataUrls?: string[];
  /** Canonical saved scan id (server UUID or local:…) after persistence */
  savedScanId?: string;
  savedScanScope?: "server" | "local";
  /** Optional plant this session / scan is associated with */
  linkedPlantId?: string;
  linkedPlantName?: string;
};

export type GrowLogEntry = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  growthStage: string;
  healthStatus: string;
  possibleIssues: string[];
  recommendedActions: string[];
  watchFor: string[];
  followUpSuggestion?: string;
  coachNotes: string;
  tags: string[];
  topStrainName?: string;
  source: "scan";
  /** Client-only snapshot id for continuity */
  scanSessionId?: string;
  /** Canonical saved scan (server or local registry) */
  sourceScanId?: string;
  sourceScanScope?: "server" | "local";
  sourceScanSummary?: string;
  sourceScanCreatedAt?: string;
  /** Same as topStrainName when originating from a scan (explicit alias for linkage UIs) */
  sourceTopStrain?: string;
  imageDataUrls?: string[];
  /** First-class plant linkage */
  plantId?: string;
  plantName?: string;
};

export type ScanChain = {
  /** Prior completed scan (for compare / progression) */
  previous: ClientScanSnapshot | null;
  last: ClientScanSnapshot | null;
};

export type GrowLogComposeDraft = {
  mode: "full" | "coach_only";
  snapshot: ClientScanSnapshot;
  userNotes: string;
  imageDataUrls?: string[];
  /** Plant chosen for this log entry (optional) */
  selectedPlantId?: string | null;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadScanChain(): ScanChain {
  return safeParse<ScanChain>(
    typeof window !== "undefined" ? localStorage.getItem(CHAIN_KEY) : null,
    { previous: null, last: null }
  );
}

export function saveScanChain(chain: ScanChain): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAIN_KEY, JSON.stringify(chain));
  } catch {
    /* quota */
  }
}

/** Call after a successful unified scan — shifts chain and stores latest snapshot */
export function recordScanSnapshot(snapshot: ClientScanSnapshot): void {
  const chain = loadScanChain();
  const next: ScanChain = {
    previous: chain.last,
    last: snapshot,
  };
  saveScanChain(next);
}

export function loadGrowLogEntries(): GrowLogEntry[] {
  return safeParse<GrowLogEntry[]>(
    typeof window !== "undefined" ? localStorage.getItem(LOG_KEY) : null,
    []
  );
}

export function appendGrowLogEntry(entry: GrowLogEntry): void {
  const cur = loadGrowLogEntries();
  cur.unshift(entry);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(cur.slice(0, 200)));
  } catch {
    /* quota */
  }
}

export function setComposeDraft(draft: GrowLogComposeDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* */
  }
}

export function loadComposeDraft(): GrowLogComposeDraft | null {
  if (typeof window === "undefined") return null;
  return safeParse<GrowLogComposeDraft | null>(
    sessionStorage.getItem(DRAFT_KEY),
    null
  );
}

export function clearComposeDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function patchGrowLogEntry(entryId: string, patch: Partial<GrowLogEntry>): void {
  if (typeof window === "undefined") return;
  const cur = loadGrowLogEntries();
  const i = cur.findIndex((e) => e.id === entryId);
  if (i < 0) return;
  const merged: GrowLogEntry = { ...cur[i] };
  for (const key of Object.keys(patch) as (keyof GrowLogEntry)[]) {
    const v = patch[key];
    if (v === undefined) {
      delete merged[key];
    } else {
      (merged as Record<string, unknown>)[key as string] = v;
    }
  }
  cur[i] = merged;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(cur.slice(0, 200)));
  } catch {
    /* */
  }
}

/** Update plant fields on chain snapshots that reference a saved scan id (after relink / unlink). */
export function patchScanChainSnapshotsForSavedScan(
  savedScanId: string,
  plant: { id: string; name: string } | null
): void {
  const chain = loadScanChain();
  const mapSnap = (s: ClientScanSnapshot | null): ClientScanSnapshot | null => {
    if (!s) return null;
    if (s.savedScanId !== savedScanId) return s;
    if (!plant) {
      const { linkedPlantId: _a, linkedPlantName: _b, ...rest } = s;
      return rest;
    }
    return { ...s, linkedPlantId: plant.id, linkedPlantName: plant.name };
  };
  saveScanChain({
    previous: mapSnap(chain.previous),
    last: mapSnap(chain.last),
  });
}
