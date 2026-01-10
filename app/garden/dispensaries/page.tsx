"use client";

import { useEffect, useState } from "react";

export default function DispensaryFinderPage() {
  const [status, setStatus] = useState("Loading dispensary finder…");

  useEffect(() => {
    setStatus("Dispensary Finder is locked and online.");
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Dispensary Finder</h1>

        <p className="text-white/70 mb-4">
          This feature is temporarily locked while the web app is stabilized.
        </p>

        <div className="text-green-400 font-mono text-sm">
          {status}
        </div>
      </div>
    </main>
  );
}
"use client";

export default function DispensaryFinderPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-4">Dispensary Finder</h1>

      <p className="text-white/70 text-center max-w-md">
        This page is temporarily in safe mode while we restore functionality.
      </p>

      <div className="mt-8 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-sm text-white/60">
          ✅ Build stability confirmed
        </p>
        <p className="text-sm text-white/60">
          🚧 ZIP-based search coming next
        </p>
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  city: string;
  state: string;
};

const SAMPLE_DISPENSARIES: Dispensary[] = [
  { id: 1, name: "Green Valley Dispensary", city: "Denver", state: "CO" },
  { id: 2, name: "Sunrise Cannabis", city: "Boulder", state: "CO" },
  { id: 3, name: "Pacific Herbal", city: "Portland", state: "OR" },
];

export default function DispensaryFinderPage() {
  const [query, setQuery] = useState("");

  const filtered = SAMPLE_DISPENSARIES.filter((d) =>
    `${d.name} ${d.city} ${d.state}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Dispensary Finder</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, city, or state"
        className="w-full max-w-md px-4 py-2 mb-6 rounded bg-white text-black"
      />

      <div className="space-y-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="p-4 rounded bg-white/10 border border-white/10"
          >
            <div className="font-semibold">{d.name}</div>
            <div className="text-sm text-white/70">
              {d.city}, {d.state}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-white/60">No dispensaries found.</div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  city: string;
  state: string;
};

export default function DispensaryFinderPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    setDispensaries([
      {
        id: 1,
        name: "Nearby Dispensary",
        city: "Local Area",
        state: "Your State",
      },
    ]);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dispensary Finder</h1>

      <div className="space-y-4">
        {dispensaries.map((d) => (
          <div
            key={d.id}
            className="border border-white/20 rounded-lg p-4"
          >
            <h2 className="text-xl font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">
              {d.city}, {d.state}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  city: string;
  state: string;
};

export default function DispensaryFinderPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    setDispensaries([
      {
        id: 1,
        name: "Nearby Dispensary",
        city: "Local Area",
        state: "Your State",
      },
    ]);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dispensary Finder</h1>

      <div className="space-y-4">
        {dispensaries.map((d) => (
          <div
            key={d.id}
            className="border border-white/20 rounded-lg p-4"
          >
            <h2 className="text-xl font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">
              {d.city}, {d.state}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  city: string;
  state: string;
};

export default function DispensaryFinderPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  useEffect(() => {
    setDispensaries([
      { id: 1, name: "Local Dispensary", city: "Nearby", state: "Your Area" },
    ]);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dispensary Finder</h1>

      <div className="space-y-4">
        {dispensaries.map((d) => (
          <div
            key={d.id}
            className="border border-white/20 rounded-lg p-4"
          >
            <h2 className="text-xl font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">
              {d.city}, {d.state}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
};

export default function DispensaryFinderPage() {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dispensaries");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setDispensaries(data);
      } catch (e) {
        setError("Unable to load dispensaries");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading dispensaries…</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Nearby Dispensaries</h1>

      {dispensaries.map((d) => (
        <div
          key={d.id}
          className="border border-white/10 rounded-lg p-4 bg-black/40"
        >
          <div className="font-semibold">{d.name}</div>
          <div className="text-sm text-white/70">
            {d.address}, {d.city}, {d.state}
          </div>
        </div>
      ))}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Dispensary = {
  id: string;
  name: string;
  address: string;
  phone?: string;
};

export default function DispensaryFinderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  /* ------------------ GEOLOCATION ------------------ */
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      }
    );
  }, []);

  /* ------------------ FETCH DISPENSARIES ------------------ */
  useEffect(() => {
    if (!coords) return;

    const runFetch = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/dispensaries?lat=${coords.latitude}&lng=${coords.longitude}&radius=60`
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
  }, [coords]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-green-400 hover:text-green-300"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-6">Nearby Dispensaries</h1>

      {loading && <p className="text-white/60">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      <div className="space-y-4">
        {dispensaries.map((d) => (
          <div
            key={d.id}
            className="bg-white/5 border border-white/10 rounded-lg p-4"
          >
            <h2 className="font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">{d.address}</p>

            <div className="mt-2 flex gap-4 text-sm">
              <a
                href={`https://www.google.com/maps/search/?query=${encodeURIComponent(d.address)}`}
                target="_blank"
                className="text-green-400 hover:underline"
              >
                Open in Google
              </a>

              {d.phone && (
                <a
                  href={`tel:${d.phone}`}
                  className="text-green-400 hover:underline"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Dispensary = {
  id: string;
  name: string;
  address: string;
  distanceMiles?: number;
  phone?: string;
};

export default function DispensaryFinderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(60);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  /* ------------------ GEOLOCATION ------------------ */
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      }
    );
  }, []);

  /* ------------------ FETCH DISPENSARIES ------------------ */
  useEffect(() => {
    if (!coords) return;

    const runFetch = async () => {
      try {
        setLoading(true);
        setError("");

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

  /* ------------------ UI ------------------ */
  return (
    <main className="min-h-screen bg-black text-white px-4 py-8 max-w-4xl mx-auto">
      
      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-green-400 hover:text-green-300"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-4">Nearby Dispensaries</h1>

      {/* FILTERS */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm text-white/70">
          Search radius:
        </label>
        <select
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(Number(e.target.value))}
          className="bg-white/10 border border-white/20 rounded px-3 py-1"
        >
          <option value={15}>15 miles</option>
          <option value={30}>30 miles</option>
          <option value={60}>60 miles</option>
        </select>
      </div>

      {/* STATES */}
      {loading && <p className="text-white/60">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* RESULTS */}
      <div className="space-y-4">
        {dispensaries.map((d) => (
          <div
            key={d.id}
            className="bg-white/5 border border-white/10 rounded-lg p-4"
          >
            <h2 className="font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">{d.address}</p>

            <div className="mt-2 flex gap-4 text-sm">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  d.address
                )}`}
                target="_blank"
                className="text-green-400 hover:underline"
              >
                Open in Google
              </a>

              {d.phone && (
                <a
                  href={`tel:${d.phone}`}
                  className="text-green-400 hover:underline"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Dispensary = {
  id: number;
  name: string;
  address: string;
  openingHours: string | null;
};

export default function DispensaryFinderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);

  const [radius, setRadius] = useState(15);
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(
            `/api/dispensaries?lat=${latitude}&lng=${longitude}&radius=${radius}`
          );
          const data = await res.json();
          setDispensaries(data.dispensaries || []);
        } catch {
          setError("Unable to load dispensaries");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location permission denied");
        setLoading(false);
      }
    );
  }, [radius]);

  const filtered = dispensaries.filter((d) => {
    const matchesText =
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.address.toLowerCase().includes(query.toLowerCase());

    const matchesOpen =
      !openOnly || (d.openingHours && d.openingHours.toLowerCase().includes("open"));

    return matchesText && matchesOpen;
  });

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-4xl font-bold mb-6">Nearby Dispensaries</h1>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          className="bg-black border border-white/20 rounded px-3 py-2"
          placeholder="Search name or city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="bg-black border border-white/20 rounded px-3 py-2"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        >
          <option value={5}>5 miles</option>
          <option value={10}>10 miles</option>
          <option value={15}>15 miles</option>
          <option value={25}>25 miles</option>
          <option value={50}>50 miles</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          Open now
        </label>
      </div>

      {loading && <p className="text-white/60">Searching your area…</p>}
      {error && <p className="text-red-400">{error}</p>}

      <ul className="space-y-4 mt-6">
        {filtered.map((d) => (
          <li key={d.id} className="border border-white/10 rounded-lg p-4">
            <h2 className="text-lg font-semibold">{d.name}</h2>
            <p className="text-sm text-white/70">{d.address}</p>
            {d.openingHours && (
              <p className="text-xs text-white/50 mt-1">
                Hours: {d.openingHours}
              </p>
            )}
          </li>
        ))}
      </ul>

      {!loading && filtered.length === 0 && !error && (
        <p className="text-white/60 mt-6">No results match your filters.</p>
      )}
    </main>
  );
}
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