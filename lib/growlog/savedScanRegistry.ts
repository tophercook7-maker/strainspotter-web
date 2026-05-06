/**
 * Local canonical index for saved scans (fallback + linkage when server unavailable).
 */

import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

const REGISTRY_KEY = "ss_saved_scans_registry_v2";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** id -> full saved scan */
export function loadSavedScanRegistry(): Record<string, SavedUnifiedScan> {
  return safeParse<Record<string, SavedUnifiedScan>>(
    typeof window !== "undefined" ? localStorage.getItem(REGISTRY_KEY) : null,
    {}
  );
}

export function upsertSavedScanLocal(saved: SavedUnifiedScan): void {
  if (typeof window === "undefined") return;
  const cur = loadSavedScanRegistry();
  cur[saved.id] = saved;
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(cur));
  } catch {
    /* quota — trim oldest */
    const keys = Object.keys(cur);
    if (keys.length > 80) {
      keys.slice(80).forEach((k) => delete cur[k]);
      try {
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(cur));
      } catch {
        /* */
      }
    }
  }
}

export function getSavedScanLocal(id: string): SavedUnifiedScan | null {
  const cur = loadSavedScanRegistry();
  return cur[id] ?? null;
}

export function listSavedScansLocalSorted(): SavedUnifiedScan[] {
  const cur = loadSavedScanRegistry();
  return Object.values(cur).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function linkGrowLogEntryToScan(scanId: string, entryId: string): void {
  const s = getSavedScanLocal(scanId);
  if (!s) return;
  const ids = new Set(s.linkedGrowLogEntryIds);
  ids.add(entryId);
  upsertSavedScanLocal({
    ...s,
    linkedGrowLogEntryIds: Array.from(ids),
  });
}

/** Patch plant linkage on an existing saved scan (local registry). */
export function patchSavedScanPlantLink(
  scanId: string,
  link: { linkedPlantId: string; linkedPlantName: string }
): void {
  const s = getSavedScanLocal(scanId);
  if (!s) return;
  upsertSavedScanLocal({
    ...s,
    linkedPlantId: link.linkedPlantId,
    linkedPlantName: link.linkedPlantName,
  });
}
