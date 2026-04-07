"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlantLogAction, updatePlantStatusAction, harvestPlantAction } from "@/app/actions/plants";
import type { PlantWithLogCount } from "@/lib/plants/plantsRepo";

const LOG_KINDS = [
  "note",
  "watering",
  "feeding",
  "training",
  "pest",
  "deficiency",
  "harvest",
  "photo",
] as const;

type TaskCounts = Record<string, { overdue: number; dueToday: number }>;

type Props = {
  plants: PlantWithLogCount[];
  taskCounts?: TaskCounts;
};

export default function PlantsListClient({ plants, taskCounts = {} }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openPlantId, setOpenPlantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<{ plantId: string; message: string } | null>(null);
  const [statusError, setStatusError] = useState<{ plantId: string; message: string } | null>(null);
  const [statusWarning, setStatusWarning] = useState<{ plantId: string; message: string } | null>(null);
  const [statusUpdatingPlantId, setStatusUpdatingPlantId] = useState<string | null>(null);
  const [harvestFormPlantId, setHarvestFormPlantId] = useState<string | null>(null);
  const [harvestDryG, setHarvestDryG] = useState("");
  const [harvestWetG, setHarvestWetG] = useState("");
  const [harvestNotes, setHarvestNotes] = useState("");
  const [note, setNote] = useState("");

  const q = query.trim().toLowerCase();
  const filtered =
    q
      ? plants.filter((p) =>
          (p.name + " " + (p.strain_name ?? "")).toLowerCase().includes(q)
        )
      : plants;

  function onSearchChange(value: string) {
    setQuery(value);
    setOpenPlantId(null);
  }

  const toggleOpen = (plantId: string) => {
    setOpenPlantId((id) => (id === plantId ? null : plantId));
    setFormError(null);
    setNote("");
  };

  const trimmedNote = note.trim();
  const canSubmit = !loading && trimmedNote.length > 0 && note.length <= 280;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, plant: PlantWithLogCount) {
    e.preventDefault();
    setFormError(null);
    const trimmed = note.trim();
    if (!trimmed) {
      setFormError({ plantId: plant.id, message: "Note is required." });
      return;
    }
    if (note.length > 280) return;
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("plantId", plant.id);
    formData.set("gardenId", plant.garden_id);
    formData.set("note", trimmed);
    const result = await createPlantLogAction(formData);
    setLoading(false);
    if ("error" in result) {
      const msg =
        result.error === "plant_not_found"
          ? "Plant not found."
          : result.error === "garden_id_mismatch"
            ? "Garden mismatch. Refresh the page."
            : result.error;
      setFormError({ plantId: plant.id, message: msg });
      return;
    }
    setFormError(null);
    setOpenPlantId(null);
    setNote("");
    form.reset();
    router.refresh();
  }

  async function handleSetStatus(plant: PlantWithLogCount, newStatus: string) {
    setStatusUpdatingPlantId(plant.id);
    setStatusError(null);
    setStatusWarning(null);
    const formData = new FormData();
    formData.set("plantId", plant.id);
    formData.set("status", newStatus);
    const result = await updatePlantStatusAction(formData);
    setStatusUpdatingPlantId(null);
    if ("error" in result) {
      setStatusError({
        plantId: plant.id,
        message: result.error === "invalid_status" ? "Invalid status." : "Update failed.",
      });
      return;
    }
    setStatusError(null);
    if ("warned" in result && result.warned) {
      setStatusWarning({ plantId: plant.id, message: "Saved, but log failed" });
    } else {
      setStatusWarning(null);
    }
    router.refresh();
  }

  async function handleHarvestSubmit(e: React.FormEvent, plant: PlantWithLogCount) {
    e.preventDefault();
    setStatusError(null);
    const dry = harvestDryG.trim();
    if (!dry || !/^\d+(\.\d+)?$/.test(dry) || Number(dry) < 0) {
      setStatusError({ plantId: plant.id, message: "Dry weight (g) is required." });
      return;
    }
    setStatusUpdatingPlantId(plant.id);
    const formData = new FormData();
    formData.set("plantId", plant.id);
    formData.set("gardenId", plant.garden_id);
    formData.set("dry_weight_g", dry);
    if (harvestWetG.trim() !== "") formData.set("wet_weight_g", harvestWetG.trim());
    if (harvestNotes.trim() !== "") formData.set("notes", harvestNotes.trim());
    const result = await harvestPlantAction(formData);
    setStatusUpdatingPlantId(null);
    if ("error" in result) {
      setStatusError({
        plantId: plant.id,
        message:
          result.error === "invalid_input"
            ? "Invalid input. Dry weight (g) required."
            : result.error === "harvest_failed"
              ? "Failed to save harvest."
              : "Update failed.",
      });
      return;
    }
    setHarvestFormPlantId(null);
    setHarvestDryG("");
    setHarvestWetG("");
    setHarvestNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Search plants…"
        value={query}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-white/50 py-4 text-center">
          No plants match your search.
        </p>
      ) : (
      filtered.map((plant) => {
        const daysAlive = plant.created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(plant.created_at).getTime()) / 86400000))
          : 0;
        const ageLabel = daysAlive === 0 ? "Today" : daysAlive === 1 ? "Yesterday" : `${daysAlive} days`;
        const labelFromDate = (dateStr: string) => {
          const daysBetween = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
          return daysBetween === 0 ? "Today" : daysBetween === 1 ? "Yesterday" : `${daysBetween} days ago`;
        };
        const harvestPill =
          plant.status?.toLowerCase() === "harvested" &&
          plant.harvest_dry_weight_g != null &&
          Number.isFinite(plant.harvest_dry_weight_g)
            ? `Harvest: ${plant.harvest_dry_weight_g} g`
            : null;
        const totalCost = plant.total_cost_usd != null && Number.isFinite(plant.total_cost_usd) ? plant.total_cost_usd : 0;
        const showCost = totalCost > 0;
        const dryG = plant.harvest_dry_weight_g != null && Number.isFinite(plant.harvest_dry_weight_g) && plant.harvest_dry_weight_g > 0 ? plant.harvest_dry_weight_g : null;
        const isHarvested = plant.status?.toLowerCase() === "harvested";
        const costPerG = showCost && isHarvested && dryG != null ? totalCost / dryG : null;
        const sublineBase = plant.last_activity_at
          ? `Last activity ${labelFromDate(plant.last_activity_at)} • ${plant.log_count} ${plant.log_count === 1 ? "log" : "logs"}`
          : `${ageLabel} • ${plant.log_count} ${plant.log_count === 1 ? "log" : "logs"}`;
        const subline = sublineBase + (showCost ? ` • Cost: $${totalCost.toFixed(2)}` : "") + (costPerG != null ? ` • $${costPerG.toFixed(2)}/g` : "");
        const isOpen = openPlantId === plant.id;

        return (
          <div
            key={plant.id}
            className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <Link
                href={`/garden/plants/${plant.id}`}
                className="flex-1 min-w-0"
              >
                <h3 className="text-white font-semibold text-lg">{plant.name}</h3>
                <p className="text-sm text-white/60 mt-0.5 break-words">{subline}</p>
                {harvestPill && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-amber-200/90 bg-white/10">
                    {harvestPill}
                  </span>
                )}
                {(() => {
                  const counts = taskCounts[plant.id];
                  if (!counts) return null;
                  if (counts.overdue > 0) {
                    return (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-rose-200/90 bg-white/10">
                        Overdue ({counts.overdue})
                      </span>
                    );
                  }
                  if (counts.dueToday > 0) {
                    return (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-amber-200/90 bg-white/10">
                        Due today ({counts.dueToday})
                      </span>
                    );
                  }
                  return null;
                })()}
                {plant.strain_name && (
                  <p className="text-white/70 text-sm mt-0.5">{plant.strain_name}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      plant.status === "active"
                        ? "bg-green-500/20 text-green-300"
                        : plant.status === "harvested"
                          ? "bg-amber-500/20 text-amber-300"
                          : plant.status === "paused"
                            ? "bg-white/15 text-white/80"
                            : "bg-white/10 text-white/80"
                    }`}
                  >
                    {plant.status}
                  </span>
                  {(() => {
                    const s = plant.status.toLowerCase();
                    const isUpdating = statusUpdatingPlantId === plant.id;
                    const pill = (label: string, onClick: (e: React.MouseEvent) => void) => (
                      <button
                        type="button"
                        onClick={onClick}
                        disabled={isUpdating}
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? "…" : label}
                      </button>
                    );
                    const stop = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                    };
                    if (s === "active") {
                      const showHarvestForm = harvestFormPlantId === plant.id;
                      return (
                        <>
                          {pill("Pause", (e) => {
                            stop(e);
                            handleSetStatus(plant, "paused");
                          })}
                          {!showHarvestForm ? (
                            pill("Harvest", (e) => {
                              stop(e);
                              setHarvestFormPlantId(plant.id);
                              setHarvestDryG("");
                              setHarvestWetG("");
                              setHarvestNotes("");
                            })
                          ) : (
                            <form
                              onSubmit={(e) => handleHarvestSubmit(e, plant)}
                              className="inline-flex flex-wrap items-center gap-1 mt-1"
                              onClick={stop}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Dry (g) *"
                                value={harvestDryG}
                                onChange={(e) => setHarvestDryG(e.target.value)}
                                className="w-16 rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                              />
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Wet (g)"
                                value={harvestWetG}
                                onChange={(e) => setHarvestWetG(e.target.value)}
                                className="w-16 rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                              />
                              <button
                                type="submit"
                                disabled={isUpdating}
                                className="px-2 py-0.5 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50"
                              >
                                {isUpdating ? "…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHarvestFormPlantId(null);
                                  setHarvestDryG("");
                                  setHarvestWetG("");
                                  setHarvestNotes("");
                                }}
                                disabled={isUpdating}
                                className="px-2 py-0.5 rounded text-xs text-white/80 hover:text-white"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </>
                      );
                    }
                    if (s === "paused") {
                      const showHarvestForm = harvestFormPlantId === plant.id;
                      return (
                        <>
                          {pill("Resume", (e) => {
                            stop(e);
                            handleSetStatus(plant, "active");
                          })}
                          {!showHarvestForm ? (
                            pill("Harvest", (e) => {
                              stop(e);
                              setHarvestFormPlantId(plant.id);
                              setHarvestDryG("");
                              setHarvestWetG("");
                              setHarvestNotes("");
                            })
                          ) : (
                            <form
                              onSubmit={(e) => handleHarvestSubmit(e, plant)}
                              className="inline-flex flex-wrap items-center gap-1 mt-1"
                              onClick={stop}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Dry (g) *"
                                value={harvestDryG}
                                onChange={(e) => setHarvestDryG(e.target.value)}
                                className="w-16 rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                              />
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Wet (g)"
                                value={harvestWetG}
                                onChange={(e) => setHarvestWetG(e.target.value)}
                                className="w-16 rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                              />
                              <button
                                type="submit"
                                disabled={isUpdating}
                                className="px-2 py-0.5 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50"
                              >
                                {isUpdating ? "…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHarvestFormPlantId(null);
                                  setHarvestDryG("");
                                  setHarvestWetG("");
                                  setHarvestNotes("");
                                }}
                                disabled={isUpdating}
                                className="px-2 py-0.5 rounded text-xs text-white/80 hover:text-white"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </>
                      );
                    }
                    if (s === "harvested") {
                      return pill("Archive", (e) => {
                        stop(e);
                        handleSetStatus(plant, "archived");
                      });
                    }
                    return null;
                  })()}
                </div>
                {statusError?.plantId === plant.id && (
                  <p className="text-sm text-red-400 mt-1">{statusError.message}</p>
                )}
                {statusWarning?.plantId === plant.id && (
                  <p className="text-sm text-amber-400 mt-1">{statusWarning.message}</p>
                )}
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {plant.created_at && (
                  <p className="text-white/50 text-xs whitespace-nowrap">
                    {new Date(plant.created_at).toLocaleDateString()}
                  </p>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleOpen(plant.id);
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  Add log
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <form
                  onSubmit={(e) => handleSubmit(e, plant)}
                  className="space-y-3"
                >
                  {formError?.plantId === plant.id && (
                    <p className="text-sm text-red-400">{formError.message}</p>
                  )}
                  <div>
                    <label htmlFor={`kind-${plant.id}`} className="block text-sm font-medium text-white/90 mb-1">
                      Kind
                    </label>
                    <select
                      id={`kind-${plant.id}`}
                      name="kind"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
                    >
                      {LOG_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`note-${plant.id}`} className="block text-sm font-medium text-white/90 mb-1">
                      Note *
                    </label>
                    <textarea
                      id={`note-${plant.id}`}
                      name="note"
                      rows={3}
                      maxLength={280}
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 280))}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
                      placeholder="What happened?"
                    />
                    <p className="text-xs text-white/50 mt-1">
                      {note.length}/280
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full rounded-lg bg-white/15 px-4 py-2 text-white font-medium hover:bg-white/25 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Adding…" : "Add Log"}
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      }) )}
    </div>
  );
}
