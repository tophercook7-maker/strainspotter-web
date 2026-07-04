import { describe, it, expect } from "vitest";
import { mergeCollection, SYNCED_COLLECTIONS } from "./cloudSync";

describe("mergeCollection — the no-data-loss login merge", () => {
  it("array: unions by id, local wins per-id conflicts, sorts newest first", () => {
    const local = [
      { id: "a", strainName: "Blue Dream", savedAt: "2026-07-02T10:00:00Z" },
      { id: "b", strainName: "OG Kush (edited)", savedAt: "2026-07-03T10:00:00Z" },
    ];
    const cloud = [
      { id: "b", strainName: "OG Kush", savedAt: "2026-07-01T10:00:00Z" },
      { id: "c", strainName: "Gelato", savedAt: "2026-07-03T12:00:00Z" },
    ];
    const merged = mergeCollection("array", local, cloud) as { id: string; strainName: string }[];
    expect(merged.map((m) => m.id)).toEqual(["c", "b", "a"]); // newest first
    expect(merged.find((m) => m.id === "b")?.strainName).toBe("OG Kush (edited)"); // local wins
  });

  it("map: key union with newer-updatedAt winning per id", () => {
    const local = {
      p1: { id: "p1", name: "Tent plant", updatedAt: "2026-07-03T09:00:00Z" },
    };
    const cloud = {
      p1: { id: "p1", name: "Tent plant (renamed on phone)", updatedAt: "2026-07-03T11:00:00Z" },
      p2: { id: "p2", name: "Outdoor plant", updatedAt: "2026-06-01T00:00:00Z" },
    };
    const merged = mergeCollection("map", local, cloud) as Record<string, { name: string }>;
    expect(Object.keys(merged).sort()).toEqual(["p1", "p2"]);
    expect(merged.p1.name).toBe("Tent plant (renamed on phone)"); // cloud is newer
  });

  it("null sides pass through untouched", () => {
    expect(mergeCollection("array", null, [{ id: "x" }])).toEqual([{ id: "x" }]);
    expect(mergeCollection("map", { a: 1 } as any, null)).toEqual({ a: 1 });
    expect(mergeCollection("object", null, null)).toBeNull();
  });

  it("object: local wins unless empty", () => {
    expect(mergeCollection("object", { last: "x" } as any, { last: "y" } as any)).toEqual({ last: "x" });
    expect(mergeCollection("object", {} as any, { last: "y" } as any)).toEqual({ last: "y" });
  });

  it("registry covers all eight garden stores", () => {
    expect(SYNCED_COLLECTIONS.map((s) => s.key).sort()).toEqual(
      [
        "ss_grow_groups_v1",
        "ss_grow_log_entries_v1",
        "ss_plants_v1",
        "ss_saved_scans_registry_v2",
        "ss_scan_chain_v1",
        "ss_session_diary",
        "strainspotter_favorites",
        "strainspotter_grows",
      ].sort()
    );
  });
});
