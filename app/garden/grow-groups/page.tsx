"use client";

import Link from "next/link";
import { useReducer } from "react";
import {
  createGrowGroup,
  listGrowGroupsSorted,
} from "@/lib/growlog/growGroupStorage";
import {
  GROW_GROUP_STATUS_LABELS,
  GROW_GROUP_TYPE_LABELS,
  type GrowGroupType,
} from "@/lib/growlog/growGroupTypes";

export default function GrowGroupsListPage() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const groups = listGrowGroupsSorted();

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <Link href="/garden" className="text-white/50 text-sm hover:text-white mb-6 inline-block">
        ← Garden
      </Link>
      <h1 className="text-2xl font-bold mb-1">Grow Groups</h1>
      <p className="text-white/50 text-sm mb-6">
        Organize plants by tent, room, outdoor plot, season, or run — optional.
      </p>

      <CreateGroupForm onCreated={refresh} />

      {groups.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center mt-6">
          <p className="text-white/60 text-sm mb-2">No Grow Groups yet.</p>
          <p className="text-white/45 text-xs">
            Create one above, or from the Plants page. You don&apos;t need a group to use the app.
          </p>
        </div>
      ) : (
        <ul className="space-y-3 mt-8">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/garden/grow-groups/${encodeURIComponent(g.id)}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="font-semibold text-lg">{g.name}</div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-white/45">
                  <span>{GROW_GROUP_TYPE_LABELS[g.type]}</span>
                  <span>·</span>
                  <span>{GROW_GROUP_STATUS_LABELS[g.status]}</span>
                  <span>·</span>
                  <span>{g.plantCount} plants</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/garden/plants"
        className="inline-block mt-8 text-sm text-green-400/90 font-semibold hover:text-green-300"
      >
        ← Your plants
      </Link>
    </div>
  );
}

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  return (
    <form
      id="create-grow-group-form"
      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") ?? "").trim();
        if (!name) return;
        const type = String(fd.get("type") ?? "other") as GrowGroupType;
        createGrowGroup({ name, type });
        onCreated();
        e.currentTarget.reset();
      }}
    >
      <div className="text-[10px] uppercase text-white/35 font-bold tracking-wide">Create group</div>
      <input
        name="name"
        placeholder="Name (e.g. Tent 1)"
        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
        required
      />
      <select
        name="type"
        aria-label="Group type"
        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
        defaultValue="other"
      >
        {(Object.keys(GROW_GROUP_TYPE_LABELS) as GrowGroupType[]).map((k) => (
          <option key={k} value={k}>
            {GROW_GROUP_TYPE_LABELS[k]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full rounded-full py-2.5 text-sm font-bold bg-gradient-to-r from-green-600 to-green-800 text-white"
      >
        Create group
      </button>
    </form>
  );
}
