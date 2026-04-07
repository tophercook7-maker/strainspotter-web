"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlantEnvReadingAction } from "@/app/actions/plants";
import type { PlantEnvReading } from "@/lib/plants/plantsRepo";

type Props = {
  plantId: string;
  gardenId: string;
  latest: PlantEnvReading | null;
};

function relativeTime(occurredAt: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(occurredAt).getTime()) / 86400000)
  );
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

export default function EnvironmentCard({ plantId, gardenId, latest }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("plantId", plantId);
    formData.set("gardenId", gardenId);
    const result = await createPlantEnvReadingAction(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error === "invalid_input" ? "Temp and RH are required." : "Failed to save.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <h2 className="text-white font-medium mb-2">Environment</h2>
      {latest ? (
        <p className="text-sm text-white/60">
          Temp {latest.temp_f}°F • RH {latest.rh}%
          {latest.vpd != null && Number.isFinite(latest.vpd) ? ` • VPD ${latest.vpd}` : ""}
          <span className="text-white/50 ml-1">— {relativeTime(latest.occurred_at)}</span>
        </p>
      ) : (
        <p className="text-sm text-white/50">No readings yet.</p>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
      >
        {open ? "Cancel" : "Add reading"}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label htmlFor="env-temp_f" className="block text-sm font-medium text-white/90 mb-1">
              Temp (°F) *
            </label>
            <input
              id="env-temp_f"
              name="temp_f"
              type="number"
              step="any"
              required
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="env-rh" className="block text-sm font-medium text-white/90 mb-1">
              RH (%) *
            </label>
            <input
              id="env-rh"
              name="rh"
              type="number"
              step="any"
              required
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="env-vpd" className="block text-sm font-medium text-white/90 mb-1">
              VPD (optional)
            </label>
            <input
              id="env-vpd"
              name="vpd"
              type="number"
              step="any"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="env-note" className="block text-sm font-medium text-white/90 mb-1">
              Note (optional, max 120)
            </label>
            <input
              id="env-note"
              name="note"
              type="text"
              maxLength={120}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="env-occurred_at" className="block text-sm font-medium text-white/90 mb-1">
              When (optional)
            </label>
            <input
              id="env-occurred_at"
              name="occurred_at"
              type="datetime-local"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white/15 px-4 py-2 text-white font-medium hover:bg-white/25 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save reading"}
          </button>
        </form>
      )}
    </div>
  );
}
