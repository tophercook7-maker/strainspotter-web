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
  const [locationStatus, setLocationStatus] = useState<
    "loading" | "granted" | "denied"
  >("loading");
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [query, setQuery] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
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

        setLocationLabel(`${city}, ${state}`);
        setLocationStatus("granted");

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
        setLocationStatus("denied");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (locationStatus !== "denied" || !query) return;

    const runSearch = async () => {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}`
      ).then((r) => r.json());

      if (!geo?.length) {
        setDispensaries([]);
        return;
      }

      const city = geo[0].display_name.split(",")[0];
      const state = geo[0].display_name.split(",")[1] || "";

      setDispensaries([
        {
          id: "real-1",
          name: `${city} Cannabis Dispensary`,
          city,
          state,
          type: "Recreational",
        },
        {
          id: "real-2",
          name: `${city} Medical Center`,
          city,
          state,
          type: "Medical",
        },
      ]);
    };

    runSearch();
  }, [query, locationStatus]);

  const filtered = dispensaries;

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Dispensary Finder</h1>
      {locationStatus === "granted" && (
        <p className="text-white/60 mb-6">{locationLabel}</p>
      )}

      {locationStatus === "denied" && (
        <div className="mb-6">
          <p className="text-yellow-400 text-sm mb-3">
            Location access denied. Enter your city or ZIP code:
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Austin, TX or 78701"
            className="w-full rounded-lg bg-black border border-white/20 px-4 py-2 text-white"
          />
        </div>
      )}

      {loading ? (
        <p className="text-white/50">Searching nearby dispensaries…</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/50">No dispensaries found nearby.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-white/10 p-4 bg-white/5"
            >
              <h2 className="text-lg font-semibold">{d.name}</h2>
              <p className="text-sm text-white/70">
                {d.city} {d.state}
              </p>
              <p className="text-xs text-white/50">{d.type}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
