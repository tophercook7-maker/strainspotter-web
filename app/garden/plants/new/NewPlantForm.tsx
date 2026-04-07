"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlantAction } from "@/app/actions/plants";

export default function NewPlantForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createPlantAction(formData);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push(`/garden/plants/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-1">
          Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
          placeholder="e.g. Blue Dream #1"
        />
      </div>
      <div>
        <label htmlFor="strain_name" className="block text-sm font-medium text-white/90 mb-1">
          Strain (optional)
        </label>
        <input
          id="strain_name"
          name="strain_name"
          type="text"
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
          placeholder="e.g. Blue Dream"
        />
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-white/90 mb-1">
          Status
        </label>
        <select
          id="status"
          name="status"
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
        >
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="harvested">harvested</option>
          <option value="archived">archived</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-white/15 px-4 py-2.5 text-white font-medium hover:bg-white/25 transition-colors"
      >
        Add Plant
      </button>
    </form>
  );
}
