"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useReducer, useState } from "react";
import {
  archiveGrowGroup,
  attachPlantToGrowGroup,
  getGrowGroupById,
  removePlantFromGrowGroup,
  updateGrowGroup,
} from "@/lib/growlog/growGroupStorage";
import {
  GROW_GROUP_STATUS_LABELS,
  GROW_GROUP_TYPE_LABELS,
  type GrowGroupStatus,
  type GrowGroupType,
} from "@/lib/growlog/growGroupTypes";
import { getPlantById, listPlantsSortedByUpdated } from "@/lib/growlog/plantStorage";

export default function GrowGroupDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const id = decodeURIComponent(rawId);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const group = useMemo(() => getGrowGroupById(id), [id, refresh]);
  const [editing, setEditing] = useState(false);

  if (!group) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-12 max-w-lg mx-auto text-center">
        <p className="text-white/60">Grow Group not found.</p>
        <Link href="/garden/grow-groups" className="text-green-400 mt-4 inline-block">
          ← Grow Groups
        </Link>
      </div>
    );
  }

  const plantsInGroup = group.plantIds
    .map((pid) => getPlantById(pid))
    .filter(Boolean);
  const allPlants = listPlantsSortedByUpdated();
  const addablePlants = allPlants.filter(
    (p) => p.growGroupId !== group.id && group.status !== "archived"
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <Link href="/garden/grow-groups" className="text-white/50 text-sm hover:text-white">
          ← Grow Groups
        </Link>
        {plantsInGroup.length > 0 && group.status !== "archived" && (
          <Link
            href={`/garden/scanner?plantId=${encodeURIComponent(plantsInGroup[0]!.id)}`}
            className="text-xs text-green-400 font-semibold"
          >
            Scan a plant
          </Link>
        )}
      </div>

      {group.status === "archived" && (
        <p className="text-amber-200/80 text-sm mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          This Grow Group is archived. It no longer appears in the main list.
        </p>
      )}

      {editing && group.status !== "archived" ? (
        <EditGroupForm
          group={group}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            refresh();
            setEditing(false);
          }}
        />
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-white/45 mb-4">
            <span>{GROW_GROUP_TYPE_LABELS[group.type]}</span>
            <span>·</span>
            <span>{GROW_GROUP_STATUS_LABELS[group.status]}</span>
            <span>·</span>
            <span>{group.plantCount} plants</span>
          </div>
          {group.notes && (
            <p className="text-white/55 text-sm mb-6 whitespace-pre-wrap">{group.notes}</p>
          )}
          {group.status !== "archived" && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm font-semibold text-green-400 hover:text-green-300 mb-6"
            >
              Edit group
            </button>
          )}
        </>
      )}

      <h2 className="text-sm font-bold uppercase tracking-wide text-white/40 mb-3">Plants in this group</h2>
      {plantsInGroup.length === 0 ? (
        <p className="text-white/45 text-sm mb-4">No plants assigned yet.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {plantsInGroup.map((p) =>
            p ? (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <Link href={`/garden/plants/${encodeURIComponent(p.id)}`} className="font-medium text-white flex-1 min-w-0">
                  {p.name}
                </Link>
                {group.status !== "archived" && (
                  <button
                    type="button"
                    className="text-[11px] text-white/45 hover:text-amber-200/90 shrink-0"
                    onClick={() => {
                      removePlantFromGrowGroup(p.id);
                      refresh();
                    }}
                  >
                    Remove from group
                  </button>
                )}
              </li>
            ) : null
          )}
        </ul>
      )}

      {group.status !== "archived" && addablePlants.length > 0 && (
        <div className="mb-8">
          <label className="text-[10px] uppercase text-white/35 block mb-1">Add plant to group</label>
          <select
            aria-label="Add plant to group"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              attachPlantToGrowGroup(v, group.id);
              refresh();
              e.target.value = "";
            }}
          >
            <option value="">Select plant</option>
            {addablePlants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname ? `${p.name} · ${p.nickname}` : p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {group.status !== "archived" && (
        <button
          type="button"
          className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-semibold text-amber-100/90"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              !window.confirm("Archive this group? Plants will be removed from the group (not deleted).")
            ) {
              return;
            }
            archiveGrowGroup(group.id);
            refresh();
          }}
        >
          Archive group
        </button>
      )}

      <Link href="/garden/plants" className="inline-block mt-8 text-sm text-green-400/90 font-semibold">
        All plants →
      </Link>
    </div>
  );
}

function EditGroupForm({
  group,
  onCancel,
  onSaved,
}: {
  group: NonNullable<ReturnType<typeof getGrowGroupById>>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  return (
    <form
      className="mb-8 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") ?? "").trim();
        if (!name) return;
        const type = String(fd.get("type") ?? "other") as GrowGroupType;
        const status = String(fd.get("status") ?? "active") as GrowGroupStatus;
        const notes = String(fd.get("notes") ?? "").trim();
        updateGrowGroup(group.id, {
          name,
          type,
          status,
          notes: notes || undefined,
        });
        onSaved();
      }}
    >
      <h1 className="text-xl font-bold mb-4">Edit group</h1>
      <label className="text-[10px] uppercase text-white/35 block mb-1">Name</label>
      <input
        name="name"
        defaultValue={group.name}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white mb-3"
        required
      />
      <label className="text-[10px] uppercase text-white/35 block mb-1">Type</label>
      <select
        name="type"
        aria-label="Group type"
        defaultValue={group.type}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white mb-3"
      >
        {(Object.keys(GROW_GROUP_TYPE_LABELS) as GrowGroupType[]).map((k) => (
          <option key={k} value={k}>
            {GROW_GROUP_TYPE_LABELS[k]}
          </option>
        ))}
      </select>
      <label className="text-[10px] uppercase text-white/35 block mb-1">Status</label>
      <select
        name="status"
        aria-label="Group status"
        defaultValue={group.status}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white mb-3"
      >
        {(["active", "completed"] as const).map((k) => (
          <option key={k} value={k}>
            {GROW_GROUP_STATUS_LABELS[k]}
          </option>
        ))}
      </select>
      <label className="text-[10px] uppercase text-white/35 block mb-1">Notes</label>
      <textarea
        name="notes"
        aria-label="Group notes"
        defaultValue={group.notes ?? ""}
        rows={3}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm mb-3"
        placeholder="Optional"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full py-2.5 border border-white/15 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-full py-2.5 bg-gradient-to-r from-green-600 to-green-800 text-sm font-bold text-white"
        >
          Save
        </button>
      </div>
    </form>
  );
}
