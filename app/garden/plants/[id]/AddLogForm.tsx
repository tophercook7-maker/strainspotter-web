"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPlantLogAction } from "@/app/actions/plants";

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

type Props = {
  plantId: string;
  gardenId: string;
  initialKind?: string;
  initialNote?: string;
  templateNonce?: number;
};

export default function AddLogForm({ plantId, gardenId, initialKind, initialNote, templateNonce }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState(initialKind ?? "note");
  const [note, setNote] = useState(initialNote ?? "");

  useEffect(() => {
    setKind(initialKind ?? "note");
    setNote(initialNote ?? "");
  }, [templateNonce, initialKind, initialNote]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("plantId", plantId);
    formData.set("gardenId", gardenId);
    formData.set("kind", kind);
    formData.set("note", note.trim());
    const result = await createPlantLogAction(formData);
    if ("error" in result) {
      const msg =
        result.error === "plant_not_found"
          ? "Plant not found."
          : result.error === "garden_id_mismatch"
            ? "Garden mismatch. Refresh the page."
            : result.error;
      setError(msg);
      return;
    }
    setKind("note");
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div>
        <label htmlFor="kind" className="block text-sm font-medium text-white/90 mb-1">
          Kind
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
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
        <label htmlFor="note" className="block text-sm font-medium text-white/90 mb-1">
          Note *
        </label>
        <textarea
          id="note"
          name="note"
          required
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
          placeholder="What happened?"
        />
      </div>
      <div>
        <label htmlFor="occurred_at" className="block text-sm font-medium text-white/90 mb-1">
          When (optional)
        </label>
        <input
          id="occurred_at"
          name="occurred_at"
          type="datetime-local"
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-white/15 px-4 py-2 text-white font-medium hover:bg-white/25 transition-colors"
      >
        Add Log
      </button>
    </form>
  );
}
