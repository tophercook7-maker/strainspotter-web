"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import {
  listGrowGroupsSorted,
  reassignPlantToGrowGroup,
  resolveGrowGroupLabelForPlant,
} from "@/lib/growlog/growGroupStorage";
import {
  getPlantById,
  getPlantTimeline,
  updatePlant,
} from "@/lib/growlog/plantStorage";

export default function PlantDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [nameEdit, setNameEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  const plant = useMemo(() => getPlantById(id), [id, version]);
  const timeline = plant ? getPlantTimeline(id) : [];
  const groupLabel = plant ? resolveGrowGroupLabelForPlant(plant) : null;

  useEffect(() => {
    if (plant) setNameEdit(plant.name);
  }, [plant, id]);

  if (!plant) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-12 max-w-lg mx-auto text-center">
        <p className="text-white/60">Plant not found.</p>
        <Link href="/garden/plants" className="text-green-400 mt-4 inline-block">
          ← Plants
        </Link>
      </div>
    );
  }

  const saveName = () => {
    const n = nameEdit.trim();
    if (!n) return;
    setSaving(true);
    updatePlant(id, { name: n });
    setSaving(false);
    setVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <Link href="/garden/plants" className="text-white/50 text-sm hover:text-white">
          ← Plants
        </Link>
        <Link
          href={`/garden/scanner?plantId=${encodeURIComponent(id)}`}
          className="text-xs text-green-400 font-semibold"
        >
          Scan this plant again
        </Link>
      </div>

      <div className="mb-6">
        <label className="text-[10px] uppercase text-white/35 block mb-1">Name</label>
        <div className="flex gap-2">
          <input
            aria-label="Plant name"
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={nameEdit}
            onChange={(e) => setNameEdit(e.target.value)}
          />
          <button
            type="button"
            onClick={saveName}
            disabled={saving || nameEdit.trim() === plant.name}
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/15 text-sm font-semibold disabled:opacity-40"
          >
            Save
          </button>
        </div>
        {plant.nickname && (
          <p className="text-green-300/80 text-sm mt-2">{plant.nickname}</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-8">
        <div className="text-[10px] uppercase text-white/35 mb-2">Grow Group</div>
        {groupLabel ? (
          <p className="text-white/85 text-sm mb-3">
            {groupLabel}
            {plant.growGroupId && (
              <Link
                href={`/garden/grow-groups/${encodeURIComponent(plant.growGroupId)}`}
                className="text-green-400 text-xs font-semibold ml-2"
              >
                Open →
              </Link>
            )}
          </p>
        ) : (
          <p className="text-white/45 text-sm mb-3">No group — optional.</p>
        )}
        <label className="text-[10px] uppercase text-white/35 block mb-1">Change group</label>
        <select
          aria-label="Change Grow Group"
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white mb-2"
          value={plant.growGroupId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            reassignPlantToGrowGroup(id, v || null);
            setVersion((x) => x + 1);
          }}
        >
          <option value="">No group</option>
          {listGrowGroupsSorted().map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Link href="/garden/grow-groups" className="text-xs text-green-400/90 font-semibold">
          Create group →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-[10px] uppercase text-white/35 mb-1">Stage</div>
          <div className="text-white">{plant.currentStageLabel ?? "—"}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-[10px] uppercase text-white/35 mb-1">Health</div>
          <div className="text-white">{plant.currentHealthLabel ?? "—"}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 col-span-2">
          <div className="text-[10px] uppercase text-white/35 mb-1">Likely strain</div>
          <div className="text-white">{plant.strainGuess ?? "—"}</div>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wide text-white/40 mb-3">
        Timeline
      </h2>
      {timeline.length === 0 ? (
        <p className="text-white/45 text-sm">No scans or log entries linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {timeline.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/10"
              >
                <div>
                  <div className="text-xs text-white/40">
                    {item.kind === "scan" ? "Scan" : "Grow Log"} ·{" "}
                    {new Date(item.at).toLocaleString()}
                  </div>
                  <div className="font-medium text-white">{item.title}</div>
                  {item.subtitle && (
                    <div className="text-xs text-white/50">{item.subtitle}</div>
                  )}
                </div>
                <span className="text-white/30 text-lg">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-col gap-3">
        <Link
          href={`/garden/scanner?plantId=${encodeURIComponent(id)}`}
          className="block text-center rounded-full py-3 text-sm font-bold bg-gradient-to-r from-green-600 to-green-800 text-white shadow-lg"
        >
          Scan this plant again
        </Link>
        <Link
          href="/garden/grow-log"
          className="block text-center rounded-full border border-white/15 py-3 text-sm font-semibold text-white/80"
        >
          Open Grow Log
        </Link>
        <Link
          href="/garden/history"
          className="block text-center rounded-full border border-white/15 py-3 text-sm font-semibold text-white/80"
        >
          Scan history
        </Link>
      </div>
    </div>
  );
}
