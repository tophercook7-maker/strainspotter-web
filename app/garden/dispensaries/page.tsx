"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  openNow?: boolean | null;
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

        const res = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
        const data = await res.json();

        setDispensaries(data.results || []);
        setLoading(false);
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

      {dispensaries.map((d) => (
        <div
          key={d.id}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <h2 className="text-xl font-semibold">{d.name}</h2>
          <p className="text-sm text-white/70">{d.address}</p>
          {d.rating && <p className="text-sm mt-1">⭐ {d.rating}</p>}
          {d.openNow !== null && (
            <p className="text-xs mt-1 text-white/60">
              {d.openNow ? "Open now" : "Closed"}
            </p>
          )}
        </div>
      ))}
    </main>
  );
}