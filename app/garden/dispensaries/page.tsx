"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  address: string;
};

export default function DispensaryFinderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(
            `/api/dispensaries?lat=${latitude}&lng=${longitude}`
          );
          const data = await res.json();
          setDispensaries(data.dispensaries || []);
        } catch {
          setError("Failed to load dispensaries");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      }
    );
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="text-4xl font-bold mb-6">Nearby Dispensaries</h1>

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