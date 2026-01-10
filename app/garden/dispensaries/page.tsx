"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  address: string;
  openingHours?: string | null;
};

export default function DispensaryFinderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const runFetch = async () => {
      if (!coords) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/dispensaries?lat=${coords.latitude}&lng=${coords.longitude}&radius=${radiusMiles}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Unable to load dispensaries");
          setDispensaries([]);
        } else {
          setDispensaries(data.dispensaries || []);
        }
      } catch {
        setError("Unable to load dispensaries");
        setDispensaries([]);
      } finally {
        setLoading(false);
      }
    };
    runFetch();
  }, [coords, radiusMiles]);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="text-4xl font-bold mb-6">Nearby Dispensaries</h1>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-white/70" htmlFor="radius">
          Search radius
        </label>
        <select
          id="radius"
          className="bg-white/5 border border-white/15 rounded px-3 py-2 text-sm"
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(Number(e.target.value))}
          disabled={loading || !coords}
        >
          {[5, 10, 15, 25, 35].map((m) => (
            <option key={m} value={m}>
              {m} miles
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-white/60">Searching your area…</p>}
      {error && <p className="text-red-400">{error}</p>}

      <ul className="space-y-4 mt-6">
        {dispensaries.map((d) => (
          <li
            key={d.id}
            className="border border-white/10 rounded-lg p-4"
          >
            <h2 className="text-lg font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">{d.address}</p>
            {d.openingHours && (
              <p className="text-xs text-white/60 mt-1">{d.openingHours}</p>
            )}
          </li>
        ))}
      </ul>

      {!loading && dispensaries.length === 0 && !error && (
        <p className="text-white/60 mt-6">
          No dispensaries found nearby.
        </p>
      )}
    </main>
  );
}