"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  openNow?: boolean | null;
  lat?: number;
  lng?: number;
};

export default function DispensaryFinderPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Unable to load nearby dispensaries.");
            setDispensaries([]);
          } else {
            setDispensaries(data.dispensaries || []);
          }
        } catch {
          setError("Network error loading dispensaries.");
          setDispensaries([]);
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

  if (loading) return <div className="p-8">Finding dispensaries near you…</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  return (
    <main className="min-h-screen p-6 space-y-4">
      <h1 className="text-3xl font-bold">Nearby Dispensaries</h1>

      {dispensaries.length === 0 && (
        <p className="text-white/60">No dispensaries found.</p>
      )}

      <div className="grid gap-4">
        {dispensaries.map((d) => (
          <div
            key={d.id}
            className="rounded-xl bg-white/5 border border-white/10 p-4"
          >
            <h2 className="text-xl font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">{d.address}</p>
            {d.rating !== undefined && <p className="text-sm mt-1">⭐ {d.rating}</p>}
            {d.openNow !== null && d.openNow !== undefined && (
              <p className="text-xs mt-1 text-white/60">
                {d.openNow ? "Open now" : "Closed"}
              </p>
            )}
            {d.lat && d.lng && (
              <p className="text-xs mt-1 text-white/50">
                {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}