/**
 * Local-first Grow Group store (localStorage). IDs: `group_<timestamp>_<rand>`.
 */

import type {
  GrowGroupRecord,
  GrowGroupSelectionOption,
  GrowGroupStatus,
  GrowGroupType,
} from "@/lib/growlog/growGroupTypes";
import type { PlantRecord } from "@/lib/growlog/plantTypes";
import { getPlantById, upsertPlant } from "@/lib/growlog/plantStorage";

const GROUPS_KEY = "ss_grow_groups_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadMap(): Record<string, GrowGroupRecord> {
  return safeParse<Record<string, GrowGroupRecord>>(
    typeof window !== "undefined" ? localStorage.getItem(GROUPS_KEY) : null,
    {}
  );
}

function saveMap(m: Record<string, GrowGroupRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(m));
  } catch {
    /* quota */
  }
}

export function getGrowGroupById(id: string): GrowGroupRecord | null {
  return loadMap()[id] ?? null;
}

export function listGrowGroups(): GrowGroupRecord[] {
  return Object.values(loadMap());
}

/** Active + completed groups (not archived), newest first */
export function listGrowGroupsSorted(): GrowGroupRecord[] {
  return listGrowGroups()
    .filter((g) => g.status !== "archived")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function listGrowGroupsIncludingArchived(): GrowGroupRecord[] {
  return listGrowGroups().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function upsertGrowGroup(group: GrowGroupRecord): void {
  const m = loadMap();
  m[group.id] = group;
  saveMap(m);
}

export function createGrowGroup(input: {
  name: string;
  type?: GrowGroupType;
  status?: GrowGroupStatus;
  notes?: string;
}): GrowGroupRecord {
  const id = `group_${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const name = input.name.trim() || "Untitled group";
  const group: GrowGroupRecord = {
    id,
    name,
    type: input.type ?? "other",
    status: input.status ?? "active",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    plantCount: 0,
    plantIds: [],
  };
  upsertGrowGroup(group);
  return group;
}

export function updateGrowGroup(
  id: string,
  patch: Partial<
    Pick<GrowGroupRecord, "name" | "type" | "status" | "notes">
  >
): GrowGroupRecord | null {
  const cur = getGrowGroupById(id);
  if (!cur) return null;
  const now = new Date().toISOString();
  const next: GrowGroupRecord = {
    ...cur,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() || cur.name : cur.name,
    updatedAt: now,
  };
  upsertGrowGroup(next);
  if (patch.name !== undefined && patch.name.trim() !== cur.name) {
    refreshGrowGroupNameOnPlants(id);
  }
  return next;
}

function refreshGrowGroupNameOnPlants(groupId: string): void {
  const g = getGrowGroupById(groupId);
  if (!g) return;
  const now = new Date().toISOString();
  for (const pid of g.plantIds) {
    const p = getPlantById(pid);
    if (!p || p.growGroupId !== groupId) continue;
    upsertPlant({ ...p, growGroupName: g.name, updatedAt: now });
  }
}

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

function recomputeGroupPlantFields(g: GrowGroupRecord): GrowGroupRecord {
  const ids = dedupeIds(g.plantIds);
  return {
    ...g,
    plantIds: ids,
    plantCount: ids.length,
    updatedAt: new Date().toISOString(),
  };
}

/** Remove a plant id from a group's list (internal). */
function removePlantIdFromGroupRecord(groupId: string, plantId: string): void {
  const g = getGrowGroupById(groupId);
  if (!g) return;
  const ids = g.plantIds.filter((id) => id !== plantId);
  upsertGrowGroup(recomputeGroupPlantFields({ ...g, plantIds: ids }));
}

/**
 * Attach a plant to a grow group. Updates plant snapshot and group plantIds.
 * Removes from previous group if any.
 */
export function attachPlantToGrowGroup(plantId: string, growGroupId: string): void {
  const plant = getPlantById(plantId);
  const group = getGrowGroupById(growGroupId);
  if (!plant || !group) return;
  if (group.status === "archived") return;

  const oldGid = plant.growGroupId?.trim();
  if (oldGid === growGroupId) {
    upsertPlant({
      ...plant,
      growGroupId: growGroupId,
      growGroupName: group.name,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (oldGid && oldGid !== growGroupId) {
    removePlantIdFromGroupRecord(oldGid, plantId);
  }

  const gNext = getGrowGroupById(growGroupId)!;
  const ids = dedupeIds([...gNext.plantIds, plantId]);
  upsertGrowGroup(recomputeGroupPlantFields({ ...gNext, plantIds: ids }));

  upsertPlant({
    ...plant,
    growGroupId: growGroupId,
    growGroupName: group.name,
    updatedAt: new Date().toISOString(),
  });
}

/** Clear plant ↔ group linkage (neutral state). */
export function removePlantFromGrowGroup(plantId: string): void {
  const plant = getPlantById(plantId);
  if (!plant) return;
  const gid = plant.growGroupId?.trim();
  if (!gid) return;
  removePlantIdFromGroupRecord(gid, plantId);
  upsertPlant({
    ...plant,
    growGroupId: undefined,
    growGroupName: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function reassignPlantToGrowGroup(plantId: string, nextGrowGroupId: string | null): void {
  if (nextGrowGroupId === null) {
    removePlantFromGrowGroup(plantId);
    return;
  }
  attachPlantToGrowGroup(plantId, nextGrowGroupId);
}

/** Mark archived and detach all plants (they become ungrouped). */
export function archiveGrowGroup(groupId: string): void {
  const g = getGrowGroupById(groupId);
  if (!g) return;
  const plantIds = [...g.plantIds];
  for (const pid of plantIds) {
    const p = getPlantById(pid);
    if (!p) continue;
    upsertPlant({
      ...p,
      growGroupId: undefined,
      growGroupName: undefined,
      updatedAt: new Date().toISOString(),
    });
  }
  upsertGrowGroup({
    ...g,
    status: "archived",
    plantIds: [],
    plantCount: 0,
    updatedAt: new Date().toISOString(),
  });
}

export function toGrowGroupSelectionOptions(): GrowGroupSelectionOption[] {
  return listGrowGroupsSorted().map((g) => ({
    id: g.id,
    label: g.name,
    subtitle: `${g.type} · ${g.plantCount} plants`,
  }));
}

/** Label for UI — handles missing or archived groups */
export function resolveGrowGroupLabelForPlant(plant: PlantRecord): string | null {
  const gid = plant.growGroupId?.trim();
  if (!gid) return null;
  const g = getGrowGroupById(gid);
  if (g) return g.status === "archived" ? `${g.name} (archived)` : g.name;
  return plant.growGroupName?.trim() || null;
}
