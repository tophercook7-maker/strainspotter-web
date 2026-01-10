"use client";

import { useState } from "react";
import { SEED_VENDORS } from "@/lib/data/seedVendors";

export default function SeedVendorsPage() {
  const [query, setQuery] = useState("");

  const filtered = SEED_VENDORS.filter((v) =>
    `${v.name}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-2">
        🌱 Seed Vendors
      </h1>

      <p className="text-center text-white/70 mb-6">
        Curated genetics sources — knowledge first, hype removed.
      </p>

      <input
        placeholder="Search vendors or specialties"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-6 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white"
      />

      <div className="space-y-4">
        {filtered.map((v) => (
          <div
            key={v.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <h2 className="text-lg font-semibold">{v.name}</h2>

            <p className="text-sm text-white/70">
              {v.region} • {v.shipping}
            </p>

            <p className="text-sm mt-2">
              {v.specialties.join(" • ")}
            </p>

            {v.reputation && (
              <p className="text-xs text-white/60 mt-2">
                {v.reputation}
              </p>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-white/50">
            No vendors found.
          </p>
        )}
      </div>

      <p className="text-center text-xs text-white/40 mt-8">
        Status: Genetics directory active
      </p>
    </main>
  );
}
