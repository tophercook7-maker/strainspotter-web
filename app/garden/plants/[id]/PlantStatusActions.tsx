"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlantStatusAction, harvestPlantAction } from "@/app/actions/plants";

type Props = { plantId: string; gardenId: string; currentStatus: string };

export default function PlantStatusActions({ plantId, gardenId, currentStatus }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [dryG, setDryG] = useState("");
  const [wetG, setWetG] = useState("");
  const [harvestNotes, setHarvestNotes] = useState("");

  async function handleSetStatus(newStatus: string) {
    setUpdating(true);
    setError(null);
    setWarning(null);
    const formData = new FormData();
    formData.set("plantId", plantId);
    formData.set("status", newStatus);
    const result = await updatePlantStatusAction(formData);
    setUpdating(false);
    if ("error" in result) {
      setError(result.error === "invalid_status" ? "Invalid status." : "Update failed.");
      return;
    }
    setError(null);
    if ("warned" in result && result.warned) {
      setWarning("Saved, but log failed");
    } else {
      setWarning(null);
    }
    router.refresh();
  }

  async function handleHarvestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dry = dryG.trim();
    if (!dry) {
      setError("Dry weight (g) is required.");
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(dry) || Number(dry) < 0) {
      setError("Dry weight must be a non-negative number.");
      return;
    }
    setUpdating(true);
    const formData = new FormData();
    formData.set("plantId", plantId);
    formData.set("gardenId", gardenId);
    formData.set("dry_weight_g", dry);
    if (wetG.trim() !== "") formData.set("wet_weight_g", wetG.trim());
    if (harvestNotes.trim() !== "") formData.set("notes", harvestNotes.trim());
    const result = await harvestPlantAction(formData);
    setUpdating(false);
    if ("error" in result) {
      setError(
        result.error === "invalid_input"
          ? "Invalid input. Dry weight (g) is required."
          : result.error === "harvest_failed"
            ? "Failed to save harvest."
            : "Update failed."
      );
      return;
    }
    setShowHarvestForm(false);
    setDryG("");
    setWetG("");
    setHarvestNotes("");
    setError(null);
    router.refresh();
  }

  const s = currentStatus.toLowerCase();
  const pill = (label: string, targetStatus: string) => (
    <button
      type="button"
      onClick={() => handleSetStatus(targetStatus)}
      disabled={updating}
      className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors disabled:opacity-50"
    >
      {updating ? "…" : label}
    </button>
  );

  const harvestForm = (
    <form onSubmit={handleHarvestSubmit} className="flex flex-wrap items-end gap-2 mt-1">
      <div>
        <label htmlFor="harvest-dry-g" className="sr-only">Dry weight (g) *</label>
        <input
          id="harvest-dry-g"
          type="text"
          inputMode="decimal"
          placeholder="Dry (g) *"
          value={dryG}
          onChange={(e) => setDryG(e.target.value)}
          className="w-20 rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="harvest-wet-g" className="sr-only">Wet weight (g)</label>
        <input
          id="harvest-wet-g"
          type="text"
          inputMode="decimal"
          placeholder="Wet (g)"
          value={wetG}
          onChange={(e) => setWetG(e.target.value)}
          className="w-20 rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="harvest-notes" className="sr-only">Notes</label>
        <input
          id="harvest-notes"
          type="text"
          placeholder="Notes"
          value={harvestNotes}
          onChange={(e) => setHarvestNotes(e.target.value.slice(0, 200))}
          className="w-28 rounded border border-white/20 bg-white/5 px-2 py-1 text-xs text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={updating}
        className="px-2 py-1 rounded text-xs font-medium bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
      >
        {updating ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setShowHarvestForm(false);
          setDryG("");
          setWetG("");
          setHarvestNotes("");
          setError(null);
        }}
        disabled={updating}
        className="px-2 py-1 rounded text-xs font-medium text-white/80 hover:text-white"
      >
        Cancel
      </button>
    </form>
  );

  const harvestTrigger = (
    <button
      type="button"
      onClick={() => setShowHarvestForm(true)}
      disabled={updating}
      className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 transition-colors disabled:opacity-50"
    >
      Harvest
    </button>
  );

  if (s === "active") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {pill("Pause", "paused")}
        {!showHarvestForm ? harvestTrigger : harvestForm}
        {error && <p className="text-sm text-red-400 w-full">{error}</p>}
        {warning && <p className="text-sm text-amber-400 w-full">{warning}</p>}
      </div>
    );
  }
  if (s === "paused") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {pill("Resume", "active")}
        {!showHarvestForm ? harvestTrigger : harvestForm}
        {error && <p className="text-sm text-red-400 w-full">{error}</p>}
        {warning && <p className="text-sm text-amber-400 w-full">{warning}</p>}
      </div>
    );
  }
  if (s === "harvested") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {pill("Archive", "archived")}
        {error && <p className="text-sm text-red-400 w-full">{error}</p>}
        {warning && <p className="text-sm text-amber-400 w-full">{warning}</p>}
      </div>
    );
  }
  return null;
}
