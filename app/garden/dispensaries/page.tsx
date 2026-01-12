"use client";

import { useEffect, useState } from "react";
import { getNearbyDispensaries } from "@/lib/dispensaries/getNearby";

type Dispensary = {
  id: string;
  name: string;
  city: string;
  distance: number;
};

export default function DispensariesPage() {
  const [items, setItems] = useState<Dispensary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Location not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const results = getNearbyDispensaries(latitude, longitude, 50);
        setItems(results as Dispensary[]);
      },
      () => setError("Location permission denied")
    );
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Nearby Dispensaries</h1>

      {error && <p className="text-red-400">{error}</p>}

      <ul className="space-y-4">
        {items.map((d) => (
          <li
            key={d.id}
            className="p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20"
          >
            <div className="font-semibold">{d.name}</div>
            <div className="text-sm text-white/70">
              {d.city} • {d.distance.toFixed(1)} mi
            </div>
          </li>
        ))}
      </ul>
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
