"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGrowPage() {
  const router = useRouter();
  const [strainName, setStrainName] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stage, setStage] = useState("veg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/garden/grows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strain_name: strainName,
          start_date: startDate,
          stage: stage,
        }),
        credentials: "include",
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("Server returned invalid JSON");
      }

      if (!res.ok) {
        setError(json?.error || "Failed to create grow");
        setLoading(false);
        return;
      }

      router.replace(`/garden/logbook/${json.grow.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create grow");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 560, margin: "0 auto" }}>
      <Link href="/garden/logbook" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
        ← Back to Logbook
      </Link>

      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Create a Grow</h1>
      <p style={{ opacity: 0.75, marginBottom: 14 }}>
        This starts a new logbook timeline.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          value={strainName}
          onChange={(e) => setStrainName(e.target.value)}
          placeholder="Strain name (e.g., Gelato 41)"
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          style={{ padding: 12, borderRadius: 12 }}
        />

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          style={{ padding: 12, borderRadius: 12 }}
        />

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          style={{ padding: 12, borderRadius: 12 }}
        >
          <option value="seed">Seed</option>
          <option value="veg">Veg</option>
          <option value="flower">Flower</option>
          <option value="dry">Dry</option>
          <option value="cure">Cure</option>
        </select>

        <button
          onClick={create}
          disabled={loading || !strainName.trim()}
          className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold disabled:opacity-50"
          style={{ padding: 14, borderRadius: 14, fontWeight: 800 }}
        >
          {loading ? "Creating…" : "Create Grow"}
        </button>

        {error && <div style={{ color: "tomato", padding: 12, borderRadius: 12, background: "#3f1f1f", border: "1px solid #ff6b6b" }}>{error}</div>}
      </div>
    </div>
  );
}
