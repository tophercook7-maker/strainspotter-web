"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string;
};

export default function DispensaryFinderPage() {
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<string>("Detecting location…");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("Location not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Reverse-geocode city/state (free, no key)
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        ).then((r) => r.json());

        const city =
          geo.address?.city ||
          geo.address?.town ||
          geo.address?.village ||
          "Your area";

        const state = geo.address?.state || "";

        setLocation(`${city}, ${state}`);

        // TEMP list — later this becomes API-powered
        setDispensaries([
          {
            id: "local-1",
            name: "Nearby Dispensary",
            city,
            state,
            type: "Recreational",
          },
          {
            id: "local-2",
            name: "Medical Cannabis Center",
            city,
            state,
            type: "Medical",
          },
        ]);

        setLoading(false);
      },
      () => {
        setLocation("Location permission denied");
        setLoading(false);
      }
    );
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Dispensary Finder</h1>
      <p className="text-white/60 mb-6">{location}</p>

      {loading ? (
        <p className="text-white/50">Searching nearby dispensaries…</p>
      ) : dispensaries.length === 0 ? (
        <p className="text-white/50">No dispensaries found nearby.</p>
      ) : (
        <div className="space-y-4">
          {dispensaries.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-white/10 p-4 bg-white/5"
            >
              <h2 className="text-lg font-semibold">{d.name}</h2>
              <p className="text-sm text-white/70">
                {d.city}, {d.state}
              </p>
              <p className="text-xs text-white/50">{d.type}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
