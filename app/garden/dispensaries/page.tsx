"use client";

import { useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  city: string;
  state: string;
};

const PLACEHOLDER_DISPENSARIES: Dispensary[] = [
  { id: 1, name: "Garden Placeholder", city: "Your Area", state: "" },
  { id: 2, name: "More Coming Soon", city: "Nearby", state: "" },
];

export default function DispensaryFinderPage() {
  const [query, setQuery] = useState("");

  const filtered = PLACEHOLDER_DISPENSARIES.filter((d) =>
    `${d.name} ${d.city} ${d.state}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Dispensary Finder</h1>
      <p className="text-white/60 mb-6">
        Location-based search coming soon. This area is intentionally locked.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search (disabled placeholder)"
        className="w-full mb-6 rounded-md bg-white/10 px-4 py-2 text-white outline-none"
      />

      <div className="space-y-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="rounded-lg bg-white/5 p-4 border border-white/10"
          >
            <p className="font-semibold">{d.name}</p>
            <p className="text-sm text-white/60">
              {d.city} {d.state}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
