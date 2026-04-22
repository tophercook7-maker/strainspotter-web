"use client";

import Link from "next/link";
import { useMemo, useReducer, useState } from "react";
import {
  createGrowGroup,
  listGrowGroupsSorted,
  reassignPlantToGrowGroup,
  resolveGrowGroupLabelForPlant,
} from "@/lib/growlog/growGroupStorage";
import { GROW_GROUP_TYPE_LABELS, type GrowGroupType } from "@/lib/growlog/growGroupTypes";
import { listPlantsSortedByUpdated } from "@/lib/growlog/plantStorage";

type Filter = "all" | "none" | string;

export default function PlantsListPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const plants = listPlantsSortedByUpdated();
  const groups = listGrowGroupsSorted();

  const filtered = useMemo(() => {
    if (filter === "all") return plants;
    if (filter === "none") return plants.filter((p) => !p.growGroupId);
    return plants.filter((p) => p.growGroupId === filter);
  }, [plants, filter]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <Link href="/garden" className="text-white/50 text-sm hover:text-white mb-6 inline-block">
        ← Garden
      </Link>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold">Your plants</h1>
        <Link
          href="/garden/grow-groups"
          className="text-xs text-green-400 font-semibold whitespace-nowrap mt-1"
        >
          Grow Groups
        </Link>
      </div>
      <p className="text-white/50 text-sm mb-6">
        Track each plant across scans and Grow Log. Optionally organize plants into Grow Groups.
      </p>

      <CreateGroupInline onCreated={refresh} />

      <div className="mb-6">
        <label className="text-[10px] uppercase text-white/35 block mb-1">Filter by group</label>
        <select
          aria-label="Filter plants by Grow Group"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          <option value="all">All plants</option>
          <option value="none">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {plants.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60 text-sm mb-4">No plants yet.</p>
          <p className="text-white/45 text-xs mb-4">
            Run a scan and link a plant on the results screen, or open the scanner.
          </p>
          <Link
            href="/garden/scanner"
            className="inline-block rounded-full bg-gradient-to-r from-green-600 to-green-800 px-5 py-2.5 text-sm font-bold text-white"
          >
            Open scanner
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-white/45 text-sm">No plants match this filter.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => {
            const gLabel = resolveGrowGroupLabelForPlant(p);
            return (
              <li key={p.id}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                  <Link href={`/garden/plants/${encodeURIComponent(p.id)}`} className="block">
                    <div className="font-semibold text-lg">{p.name}</div>
                    {p.nickname && (
                      <div className="text-green-300/80 text-sm mt-0.5">{p.nickname}</div>
                    )}
                    {gLabel && (
                      <div className="text-[11px] text-emerald-200/70 mt-1.5 font-medium">
                        Group · {gLabel}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/45">
                      <span>{p.scanCount} scans</span>
                      <span>{p.growLogEntryCount} log entries</span>
                      {p.strainGuess && <span>~{p.strainGuess}</span>}
                    </div>
                  </Link>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <label className="text-[10px] uppercase text-white/30 block mb-1">Group</label>
                    <select
                      aria-label={`Change group for ${p.name}`}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-xs text-white"
                      value={p.growGroupId ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        reassignPlantToGrowGroup(p.id, v || null);
                        refresh();
                      }}
                    >
                      <option value="">No group</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CreateGroupInline({ onCreated }: { onCreated: () => void }) {
  return (
    <form
      className="rounded-xl border border-white/10 bg-white/5 p-3 mb-6"
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
      <div className="text-[10px] uppercase text-white/35 font-bold tracking-wide mb-2">Quick create Grow Group</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          name="name"
          placeholder="Group name"
          className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
        />
        <select
          name="type"
          aria-label="New group type"
          className="rounded-lg bg-black/40 border border-white/10 px-2 py-2 text-sm text-white"
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
          className="rounded-full px-4 py-2 text-sm font-bold bg-white/10 border border-white/15 hover:bg-white/15"
        >
          Create
        </button>
      </div>
    </form>
  );
}
