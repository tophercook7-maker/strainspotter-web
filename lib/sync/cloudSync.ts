// lib/sync/cloudSync.ts
//
// Cloud sync for the garden's localStorage data. Generic by design: each
// feature keeps its existing localStorage key + shape; this engine mirrors
// those documents to public.user_collections (client-direct under RLS).
//
// Sync model:
//   1. ON LOGIN (once per session): UNION-MERGE cloud + local per collection —
//      no device ever loses items at the merge point — write merged local,
//      push merged up.
//   2. AFTER THAT: local is authoritative. Changed documents push
//      last-write-wins (so in-session deletions actually stick), on a 20s
//      change-scan plus tab-hide.
//
// Merge shapes:
//   "map"    — Record<id, item>: key union; per-id conflicts prefer the item
//              with the newer updatedAt, else local.
//   "array"  — item[] with .id: union by id (local wins per-id), sorted by
//              createdAt/savedAt desc when present.
//   "object" — opaque single doc: cloud only fills an empty local.

export type CollectionKind = "map" | "array" | "object";

export interface CollectionSpec {
  /** localStorage key AND user_collections.collection name. */
  key: string;
  kind: CollectionKind;
}

/** Every user-data store the garden writes. Preference/ephemeral keys stay local. */
export const SYNCED_COLLECTIONS: CollectionSpec[] = [
  { key: "ss_plants_v1", kind: "map" },
  { key: "ss_grow_groups_v1", kind: "map" },
  { key: "ss_saved_scans_registry_v2", kind: "map" },
  { key: "ss_grow_log_entries_v1", kind: "array" },
  { key: "ss_session_diary", kind: "array" },
  { key: "strainspotter_favorites", kind: "array" },
  { key: "strainspotter_grows", kind: "array" },
  { key: "ss_scan_chain_v1", kind: "object" },
];

type Json = Record<string, unknown> | unknown[] | null;

function itemTime(v: unknown): number {
  if (!v || typeof v !== "object") return 0;
  const o = v as Record<string, unknown>;
  for (const f of ["updatedAt", "createdAt", "savedAt", "created_at"]) {
    const t = o[f];
    if (typeof t === "string") {
      const ms = Date.parse(t);
      if (!Number.isNaN(ms)) return ms;
    }
    if (typeof t === "number") return t;
  }
  return 0;
}

export function mergeCollection(kind: CollectionKind, local: Json, cloud: Json): Json {
  if (cloud == null) return local;
  if (local == null) return cloud;

  if (kind === "map") {
    const l = (typeof local === "object" && !Array.isArray(local) ? local : {}) as Record<string, unknown>;
    const c = (typeof cloud === "object" && !Array.isArray(cloud) ? cloud : {}) as Record<string, unknown>;
    const out: Record<string, unknown> = { ...c };
    for (const [id, item] of Object.entries(l)) {
      const cloudItem = out[id];
      out[id] = cloudItem == null || itemTime(item) >= itemTime(cloudItem) ? item : cloudItem;
    }
    return out;
  }

  if (kind === "array") {
    const l = Array.isArray(local) ? local : [];
    const c = Array.isArray(cloud) ? cloud : [];
    const byId = new Map<string, unknown>();
    // cloud first, local overwrites per-id (device in hand wins conflicts)
    for (const item of c) {
      const id = (item as Record<string, unknown>)?.id;
      if (typeof id === "string") byId.set(id, item);
    }
    for (const item of l) {
      const id = (item as Record<string, unknown>)?.id;
      if (typeof id === "string") byId.set(id, item);
    }
    return [...byId.values()].sort((a, b) => itemTime(b) - itemTime(a));
  }

  // "object" — opaque doc: keep local unless it's effectively empty.
  const localEmpty =
    (typeof local === "object" && !Array.isArray(local) && Object.keys(local).length === 0);
  return localEmpty ? cloud : local;
}

/* ── Engine (browser only) ─────────────────────────────────────────── */

function readLocal(key: string): Json {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Json) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, data: Json): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota — sync silently degrades */ }
}

function fingerprint(data: Json): string {
  return data == null ? "" : JSON.stringify(data);
}

export interface SyncClient {
  from: (table: string) => any;
}

/**
 * One full sync pass. Called once with `initial=true` right after login
 * (union-merge), then periodically with `initial=false` (LWW push of local
 * changes only). `lastPushed` carries fingerprints between passes.
 */
export async function syncPass(
  supabase: SyncClient,
  userId: string,
  lastPushed: Map<string, string>,
  initial: boolean
): Promise<void> {
  if (initial) {
    const { data: rows, error } = await supabase
      .from("user_collections")
      .select("collection, data")
      .eq("user_id", userId);
    if (error) return; // offline / RLS hiccup — next pass retries as initial? no: caller keeps initial until success
    const cloudByKey = new Map<string, Json>(
      ((rows ?? []) as { collection: string; data: Json }[]).map((r) => [r.collection, r.data])
    );

    for (const spec of SYNCED_COLLECTIONS) {
      const local = readLocal(spec.key);
      const cloud = cloudByKey.get(spec.key) ?? null;
      const merged = mergeCollection(spec.kind, local, cloud);
      if (merged == null) { lastPushed.set(spec.key, ""); continue; }

      if (fingerprint(merged) !== fingerprint(local)) writeLocal(spec.key, merged);
      if (fingerprint(merged) !== fingerprint(cloud)) {
        await supabase.from("user_collections").upsert({
          user_id: userId,
          collection: spec.key,
          data: merged,
          updated_at: new Date().toISOString(),
        });
      }
      lastPushed.set(spec.key, fingerprint(merged));
    }
    return;
  }

  // Steady state: push only what changed locally.
  for (const spec of SYNCED_COLLECTIONS) {
    const local = readLocal(spec.key);
    const fp = fingerprint(local);
    if (local == null || fp === lastPushed.get(spec.key)) continue;
    const { error } = await supabase.from("user_collections").upsert({
      user_id: userId,
      collection: spec.key,
      data: local,
      updated_at: new Date().toISOString(),
    });
    if (!error) lastPushed.set(spec.key, fp);
  }
}
