"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: string;
  name: string;
  city: string;
  distance: number;
};

export default function DispensaryFinderPage() {
  const [loading, setLoading] = useState(true);
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    setTimeout(() => {
      setDispensaries([
        { id: "1", name: "Green Remedy", city: "Little Rock", distance: 4.2 },
        { id: "2", name: "Natural Relief", city: "Conway", distance: 18.6 },
        { id: "3", name: "Ozark Wellness", city: "Fayetteville", distance: 32.1 },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  return (
    <main className="min-h-screen bg-black text-green-400 px-6 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Dispensary Finder</h1>
        <p className="text-white/70 mb-10">
          Nearby dispensaries (no maps, no paid APIs)
        </p>

        {loading && <p className="opacity-70">Loading…</p>}

        <div className="space-y-4">
          {dispensaries.map((d) => (
            <div
              key={d.id}
              className="flex justify-between items-center rounded-xl bg-white/10 backdrop-blur border border-white/20 px-6 py-4"
            >
              <div className="text-left">
                <p className="font-semibold text-white">{d.name}</p>
                <p className="text-sm text-white/60">{d.city}</p>
              </div>
              <p className="text-sm text-green-300">
                {d.distance.toFixed(1)} mi
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
"use client";

export default function DispensaryFinderPage() {
  return (
    <main className="min-h-screen bg-black text-green-400 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Dispensary Finder</h1>
        <p className="opacity-70">
          Module temporarily disabled while rebuilding.
        </p>
      </div>
    </main>
  );
}
