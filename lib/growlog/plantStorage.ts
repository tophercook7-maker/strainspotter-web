/**
 * Local-first plant store (localStorage). IDs: `plant_<timestamp>_<rand>`.
 */

import type { PlantRecord, PlantSelectionOption, PlantStatus, PlantTimelineItem } from "@/lib/growlog/plantTypes";
import {
  loadGrowLogEntries,
  loadScanChain,
  patchGrowLogEntry,
  patchScanChainSnapshotsForSavedScan,
} from "@/lib/growlog/growLogStorage";
import { getSavedScanLocal, upsertSavedScanLocal } from "@/lib/growlog/savedScanRegistry";
import { savedScanResultsPath } from "@/lib/scanner/savedScanNav";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";
const PLANTS_KEY = "ss_plants_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadMap(): Record<string, PlantRecord> {
  return safeParse<Record<string, PlantRecord>>(
    typeof window !== "undefined" ? localStorage.getItem(PLANTS_KEY) : null,
    {}
  );
}

function saveMap(m: Record<string, PlantRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLANTS_KEY, JSON.stringify(m));
  } catch {
    /* quota */
  }
}

export function listPlants(): PlantRecord[] {
  return Object.values(loadMap()).filter((p) => p.status !== "archived");
}

export function listPlantsSortedByUpdated(): PlantRecord[] {
  return listPlants().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getPlantById(id: string): PlantRecord | null {
  return loadMap()[id] ?? null;
}

export function upsertPlant(plant: PlantRecord): void {
  const m = loadMap();
  m[plant.id] = plant;
  saveMap(m);
}

export function createPlant(input: {
  name: string;
  nickname?: string;
  notes?: string;
}): PlantRecord {
  const id = `plant_${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const name = input.name.trim() || "Unnamed plant";
  const plant: PlantRecord = {
    id,
    name,
    nickname: input.nickname?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    status: "active",
    scanCount: 0,
    growLogEntryCount: 0,
    linkedScanIds: [],
    growLogEntryIds: [],
  };
  upsertPlant(plant);
  return plant;
}

export function updatePlant(
  id: string,
  patch: Partial<
    Pick<
      PlantRecord,
      | "name"
      | "nickname"
      | "notes"
      | "status"
      | "strainGuess"
      | "plantTypeLabel"
      | "currentStageLabel"
      | "currentHealthLabel"
      | "coverImageUrl"
    >
  >
): PlantRecord | null {
  const cur = getPlantById(id);
  if (!cur) return null;
  const now = new Date().toISOString();
  const next: PlantRecord = {
    ...cur,
    ...patch,
    updatedAt: now,
    name: patch.name !== undefined ? patch.name.trim() || cur.name : cur.name,
  };
  upsertPlant(next);
  return next;
}

function recomputePlantScanAggregates(plant: PlantRecord): PlantRecord {
  const ids = Array.from(new Set(plant.linkedScanIds.filter(Boolean)));
  const now = new Date().toISOString();
  if (ids.length === 0) {
    return {
      ...plant,
      linkedScanIds: [],
      scanCount: 0,
      latestScanId: undefined,
      updatedAt: now,
    };
  }
  let latestId: string | undefined;
  let latestMs = -1;
  for (const sid of ids) {
    const sc = getSavedScanLocal(sid);
    const t = sc ? Date.parse(sc.createdAt) : NaN;
    if (Number.isFinite(t) && t >= latestMs) {
      latestMs = t;
      latestId = sid;
    }
  }
  const latestScan = latestId ? getSavedScanLocal(latestId) : null;
  return {
    ...plant,
    linkedScanIds: ids,
    scanCount: ids.length,
    latestScanId: latestId,
    strainGuess: latestScan?.topStrainName ?? latestScan?.matches[0]?.name ?? plant.strainGuess,
    currentStageLabel: latestScan?.plantAnalysis.growthStage?.label ?? plant.currentStageLabel,
    currentHealthLabel: latestScan?.plantAnalysis.health?.label ?? plant.currentHealthLabel,
    plantTypeLabel: latestScan?.plantAnalysis.typeEstimate?.label ?? plant.plantTypeLabel,
    updatedAt: now,
  };
}

function removeGrowLogEntryIdFromPlantRecord(plantId: string, entryId: string): void {
  const p = getPlantById(plantId);
  if (!p) return;
  const ids = p.growLogEntryIds.filter((id) => id !== entryId);
  upsertPlant({
    ...p,
    growLogEntryIds: ids,
    growLogEntryCount: Math.max(0, ids.length),
    updatedAt: new Date().toISOString(),
  });
}

/** Merge plant link into saved scan registry + update plant aggregates. */
export function attachScanToPlant(plantId: string, saved: SavedUnifiedScan): void {
  const plant = getPlantById(plantId);
  if (!plant) return;

  const scanIds = new Set(plant.linkedScanIds);
  const isNew = !scanIds.has(saved.id);
  if (isNew) scanIds.add(saved.id);

  const mergedScan: SavedUnifiedScan = {
    ...saved,
    linkedPlantId: plantId,
    linkedPlantName: plant.name,
  };
  upsertSavedScanLocal(mergedScan);

  const next: PlantRecord = {
    ...plant,
    updatedAt: new Date().toISOString(),
    linkedScanIds: Array.from(scanIds),
    latestScanId: saved.id,
    scanCount: isNew ? plant.scanCount + 1 : plant.scanCount,
    strainGuess: saved.topStrainName ?? saved.matches[0]?.name ?? plant.strainGuess,
    currentStageLabel: saved.plantAnalysis.growthStage?.label ?? plant.currentStageLabel,
    currentHealthLabel: saved.plantAnalysis.health?.label ?? plant.currentHealthLabel,
    plantTypeLabel: saved.plantAnalysis.typeEstimate?.label ?? plant.plantTypeLabel,
  };
  upsertPlant(next);
}

export function attachGrowLogEntryToPlant(plantId: string, entryId: string): void {
  const plant = getPlantById(plantId);
  if (!plant) return;
  const ids = new Set(plant.growLogEntryIds);
  if (ids.has(entryId)) return;
  ids.add(entryId);
  upsertPlant({
    ...plant,
    updatedAt: new Date().toISOString(),
    growLogEntryIds: Array.from(ids),
    growLogEntryCount: plant.growLogEntryCount + 1,
  });
}

/**
 * Remove plant linkage from a saved scan and keep the plant record + timeline consistent.
 */
export function unlinkScanFromPlant(scanId: string): void {
  const s = getSavedScanLocal(scanId);
  if (!s) return;
  const oldPid = s.linkedPlantId?.trim() || null;
  upsertSavedScanLocal({
    ...s,
    linkedPlantId: null,
    linkedPlantName: null,
  });
  if (oldPid) {
    const p = getPlantById(oldPid);
    if (p) {
      const filtered = p.linkedScanIds.filter((id) => id !== scanId);
      upsertPlant(recomputePlantScanAggregates({ ...p, linkedScanIds: filtered }));
    }
  }
  patchScanChainSnapshotsForSavedScan(scanId, null);
}

/**
 * Move a saved scan to another plant (or unlink with `nextPlantId === null`).
 */
export function reassignScanToPlant(scanId: string, nextPlantId: string | null): void {
  if (nextPlantId === null) {
    unlinkScanFromPlant(scanId);
    return;
  }
  const nextId = nextPlantId.trim();
  if (!getPlantById(nextId)) return;
  const s = getSavedScanLocal(scanId);
  if (!s) return;
  const oldPid = s.linkedPlantId?.trim() || null;
  if (oldPid === nextId) return;
  if (oldPid) {
    const op = getPlantById(oldPid);
    if (op) {
      const filtered = op.linkedScanIds.filter((id) => id !== scanId);
      upsertPlant(recomputePlantScanAggregates({ ...op, linkedScanIds: filtered }));
    }
  }
  const cleared: SavedUnifiedScan = { ...s, linkedPlantId: null, linkedPlantName: null };
  attachScanToPlant(nextId, cleared);
  const np = getPlantById(nextId);
  if (np) {
    patchScanChainSnapshotsForSavedScan(scanId, { id: nextId, name: np.name });
  }
}

/** Remove plant linkage from a Grow Log entry and update plant aggregates. */
export function unlinkGrowLogEntryFromPlant(entryId: string): void {
  const entries = loadGrowLogEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;
  const oldPid = entry.plantId?.trim() || null;
  if (oldPid) {
    removeGrowLogEntryIdFromPlantRecord(oldPid, entryId);
  }
  patchGrowLogEntry(entryId, { plantId: undefined, plantName: undefined });
}

/** Move a Grow Log entry to another plant (or unlink with `nextPlantId === null`). */
export function reassignGrowLogEntryToPlant(entryId: string, nextPlantId: string | null): void {
  const entries = loadGrowLogEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;
  if (nextPlantId === null) {
    unlinkGrowLogEntryFromPlant(entryId);
    return;
  }
  const nextId = nextPlantId.trim();
  const np = getPlantById(nextId);
  if (!np) return;
  const oldPid = entry.plantId?.trim() || null;
  if (oldPid === nextId) return;
  if (oldPid) {
    removeGrowLogEntryIdFromPlantRecord(oldPid, entryId);
  }
  attachGrowLogEntryToPlant(nextId, entryId);
  patchGrowLogEntry(entryId, { plantId: nextId, plantName: np.name });
}

export function toPlantSelectionOptions(): PlantSelectionOption[] {
  return listPlantsSortedByUpdated().map((p) => ({
    id: p.id,
    label: p.nickname ? `${p.name} · ${p.nickname}` : p.name,
    subtitle: p.strainGuess ?? p.currentStageLabel,
  }));
}

export function getPlantTimeline(plantId: string): PlantTimelineItem[] {
  const plant = getPlantById(plantId);
  if (!plant) return [];

  const items: PlantTimelineItem[] = [];

  for (const scanId of plant.linkedScanIds) {
    const s = getSavedScanLocal(scanId);
    const at = s?.createdAt ?? "";
    items.push({
      kind: "scan",
      id: scanId,
      at,
      title: s?.topStrainName || s?.matches[0]?.name || "Scan",
      subtitle: s?.plantAnalysis.growthStage?.label,
      href: savedScanResultsPath(scanId),
    });
  }

  const entries = loadGrowLogEntries().filter((e) => e.plantId === plantId);
  for (const e of entries) {
    items.push({
      kind: "log",
      id: e.id,
      at: e.createdAt,
      title: e.title,
      subtitle: e.growthStage || undefined,
      href: `/garden/grow-log/entry/${e.id}`,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items;
}

/** Active plant preference for scanner session (optional). */
const ACTIVE_PLANT_KEY = "ss_active_plant_id";

export function getActivePlantIdPreference(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_PLANT_KEY);
  } catch {
    return null;
  }
}

export function setActivePlantIdPreference(plantId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (plantId) localStorage.setItem(ACTIVE_PLANT_KEY, plantId);
    else localStorage.removeItem(ACTIVE_PLANT_KEY);
  } catch {
    /* */
  }
}

export function clearActivePlantIdPreference(): void {
  setActivePlantIdPreference(null);
}

/** Persist the user's default plant target for the scanner (local preference). */
export function setScannerPlantContext(plantId: string | null): void {
  setActivePlantIdPreference(plantId);
}

/**
 * Effective plant for the current scan: explicit selection (incl. URL-hydrated) wins,
 * then last scan chain snapshot when still valid.
 */
export function getScannerEffectivePlantId(input: {
  forceNoPlant: boolean;
  plantSelectionId: string | null;
}): string | null {
  if (input.forceNoPlant) return null;
  const sel = input.plantSelectionId?.trim();
  if (sel && getPlantById(sel)) return sel;
  const chain = loadScanChain();
  const c = chain.last?.linkedPlantId?.trim();
  return c && getPlantById(c) ? c : null;
}
