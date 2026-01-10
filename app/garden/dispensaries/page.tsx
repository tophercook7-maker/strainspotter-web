"use client";

import { useState } from "react";
import { DISPENSARIES } from "@/lib/data/dispensaries";

export default function DispensaryFinderPage() {
  const [query, setQuery] = useState("");

  const filtered = DISPENSARIES.filter((d) =>
    `${d.name} ${d.city} ${d.state}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-2">
        🏪 Dispensary Finder
      </h1>

      <p className="text-center text-white/70 mb-6">
        Verified dispensaries — curated and expanding.
      </p>

      <input
        placeholder="Search by name, city, or state"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-6 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white"
      />

      <div className="space-y-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{d.name}</h2>
              <span className="text-xs text-green-400">{d.type}</span>
            </div>

            <p className="text-sm text-white/70">
              {d.city}, {d.state}
            </p>

          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-white/50">
            No dispensaries found.
          </p>
        )}
      </div>

      <p className="text-center text-xs text-white/40 mt-8">
        Status: Directory mode active
      </p>
    </main>
  );
}
