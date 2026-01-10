"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: string;
  name: string;
  address: string;
  openNow?: boolean;
  rating?: number;
};

export default function DispensaryFinderPage() {
  const [query, setQuery] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const searchByLocation = async (lat: number, lng: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
      if (!res.ok) {
        throw new Error("Failed to fetch places");
      }
      const data = await res.json();
      setDispensaries(data);
    } catch (e) {
      setError("Unable to load nearby dispensaries right now.");
      setDispensaries([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByText = async () => {
    if (!query) return;
    if (!apiKey) {
      setError("Missing maps API key; cannot search by address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const geo = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query
        )}&key=${apiKey}`
      ).then((r) => r.json());

      if (!geo.results?.length) {
        setError("Location not found");
        setDispensaries([]);
        setLoading(false);
        return;
      }

      const { lat, lng } = geo.results[0].geometry.location;
      await searchByLocation(lat, lng);
    } catch (e) {
      setError("Unable to look up that location right now.");
      setDispensaries([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Location not supported. Enter city or ZIP.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        searchByLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setError("Location access denied. Enter city or ZIP.");
      }
    );
  }, []);

  return (
    <main className="p-6 max-w-xl mx-auto bg-black text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Dispensary Finder</h1>

      {error && (
        <div className="mb-4">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-white text-black px-3 py-2"
              placeholder="Enter city or ZIP"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByText()}
            />
            <button
              className="rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold"
              onClick={searchByText}
              disabled={loading}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-white/60 mb-4">Searching nearby dispensaries…</p>
      )}

      <ul className="space-y-4">
        {dispensaries.map((d) => (
          <li key={d.id} className="border border-white/10 p-4 rounded-lg bg-white/5">
            <h2 className="font-semibold text-lg">{d.name}</h2>
            <p className="text-sm text-white/80">{d.address}</p>
            {d.rating !== undefined && (
              <p className="text-sm text-white/70">⭐ {d.rating}</p>
            )}
            {d.openNow !== undefined && (
              <p className="text-sm text-white/70">
                {d.openNow ? "Open now" : "Closed"}
              </p>
            )}
          </li>
        ))}
      </ul>

      {!dispensaries.length && !loading && (
        <p className="text-white/50 mt-4">No dispensaries to show.</p>
      )}
    </main>
  );
}
