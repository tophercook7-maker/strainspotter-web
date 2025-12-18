"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { summarizeGrow } from "@/lib/logbook/compare";
import { getPreviousGrow } from "@/lib/logbook/previousGrow";
import { compareMetrics } from "@/lib/logbook/trends";
import { coachSummary } from "@/lib/logbook/coachSummary";

function StatCard({ title, value }: any) {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 12, background: "#111" }}>
      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Chip({ text }: any) {
  return (
    <span style={{
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 999,
      border: "1px solid #333",
      marginRight: 6,
      marginBottom: 6,
      fontSize: 12,
      background: "#1a1a1a",
    }}>
      {text}
    </span>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>({ grows: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  useEffect(() => {
    fetch("/api/garden/compare", {
      credentials: "include",
    })
      .then(async r => {
        const text = await r.text();
        const json = text ? JSON.parse(text) : null;
        return json;
      })
      .then(data => {
        setData(data || { grows: [], logs: [] });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching compare data:", err);
        setLoading(false);
      });
  }, []);

  const grows = data.grows ?? [];
  const logs = data.logs ?? [];

  // Auto-select from URL params
  useEffect(() => {
    const auto = searchParams.get("auto");
    const currentId = searchParams.get("id");
    
    if (auto === "last" && currentId && grows.length >= 2) {
      const current = grows.find((g:any) => g.id === currentId);
      if (!current) return;
      const prev = getPreviousGrow(current, grows);
      if (!prev) return;

      setA(current.id);
      setB(prev.id);
    } else if (grows.length >= 2 && (!a || !b)) {
      setA(grows[0].id);
      setB(grows[1].id);
    } else if (grows.length === 1 && !a) {
      setA(grows[0].id);
    }
  }, [grows, a, b, searchParams]);

  const summaryA = useMemo(() => {
    const grow = grows.find((g: any) => g.id === a);
    return grow ? summarizeGrow(grow, logs) : null;
  }, [a, grows, logs]);

  const summaryB = useMemo(() => {
    const grow = grows.find((g: any) => g.id === b);
    return grow ? summarizeGrow(grow, logs) : null;
  }, [b, grows, logs]);

  const trends = useMemo(() => {
    if (summaryA && summaryB) {
      return compareMetrics(summaryA, summaryB);
    }
    return null;
  }, [summaryA, summaryB]);

  const coachInsights = useMemo(() => {
    return trends ? coachSummary(trends) : [];
  }, [trends]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (grows.length < 2) {
    return (
      <div className="min-h-screen bg-black text-white" style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <Link href="/garden/logbook" className="text-emerald-400 mb-4 inline-block text-sm">
          ← Back to Logbook
        </Link>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Compare Grows</h1>
        <p style={{ opacity: 0.8, marginBottom: 14 }}>
          You need at least 2 grows to compare. <Link href="/garden/logbook/new" className="text-emerald-400 underline">Create another grow</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <Link href="/garden/logbook" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Logbook
      </Link>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Compare Grows</h1>
      <p style={{ opacity: 0.8, marginBottom: 14 }}>
        Compare progress, consistency, and patterns across two grows.
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Grow A</div>
          <select 
            value={a} 
            onChange={e => setA(e.target.value)} 
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          >
            <option value="">Select a grow...</option>
            {grows.map((g: any) => (
              <option key={g.id} value={g.id}>{g.strain_name} — {g.start_date}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Grow B</div>
          <select 
            value={b} 
            onChange={e => setB(e.target.value)} 
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          >
            <option value="">Select a grow...</option>
            {grows.map((g: any) => (
              <option key={g.id} value={g.id}>{g.strain_name} — {g.start_date}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {[["Grow A", summaryA], ["Grow B", summaryB]].map(([label, s]: any) => (
          <div key={label} style={{ border: "1px solid #333", borderRadius: 18, padding: 14, background: "#111" }}>
            {!s ? (
              <div style={{ opacity: 0.7 }}>Select a grow…</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{s.strain_name}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>Started {s.start_date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>Current Stage</div>
                    <div style={{ fontWeight: 900 }}>{String(s.stage).toUpperCase()}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 12 }}>
                  <StatCard title="Logs" value={s.totalLogs} />
                  <StatCard title="Photos" value={s.totalPhotos} />
                  <StatCard title="Streak" value={`${s.streak} days`} />
                  <StatCard title="Stage entries" value={Object.keys(s.stageCounts).length} />
                </div>

                {/* Trend comparison (only for Grow A when both are selected) */}
                {label === "Grow A" && trends && (
                  <div style={{ marginTop: 12, padding: 12, background: "#1a1a1a", borderRadius: 12, border: "1px solid #333" }}>
                    <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>
                      Trend vs previous grow
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                      <li style={{ marginBottom: 4 }}>
                        Logs: <span style={{ color: trends.logs >= 0 ? "#34d399" : "#f87171" }}>
                          {trends.logs >= 0 ? "+" : ""}{trends.logs}
                        </span>
                      </li>
                      <li style={{ marginBottom: 4 }}>
                        Photos: <span style={{ color: trends.photos >= 0 ? "#34d399" : "#f87171" }}>
                          {trends.photos >= 0 ? "+" : ""}{trends.photos}
                        </span>
                      </li>
                      <li>
                        Streak: <span style={{ color: trends.streak >= 0 ? "#34d399" : "#f87171" }}>
                          {trends.streak >= 0 ? "+" : ""}{trends.streak} days
                        </span>
                      </li>
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Stage breakdown</div>
                  {Object.entries(s.stageCounts).length === 0 ? (
                    <div style={{ opacity: 0.7 }}>No entries yet.</div>
                  ) : (
                    <div>
                      {Object.entries(s.stageCounts).map(([k,v]: any) => (
                        <Chip key={k} text={`${k.toUpperCase()}: ${v}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Common themes (from notes)</div>
                  {s.topKeywords.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>Log notes to see patterns here.</div>
                  ) : (
                    <div>
                      {s.topKeywords.map((x: any) => (
                        <Chip key={x.w} text={`${x.w} (${x.c})`} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <Link href={`/garden/logbook/${s.id}`}>
                    <button 
                      className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition"
                    >
                      Open this Grow
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Coach Summary */}
      {coachInsights.length > 0 && (
        <div style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 16,
          border: "1px solid #333",
          background: "#111",
        }}>
          <strong style={{ fontSize: 16, display: "block", marginBottom: 8 }}>🧠 Grow Coach Summary</strong>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
            {coachInsights.map((s: string, i: number) => (
              <li key={i} style={{ marginBottom: 4 }}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
