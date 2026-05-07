"use client";

// app/garden/history/_components/HistoryList.tsx
//
// Client-side search/filter overlay for the (server-rendered) scan
// history. The server renders the scans; this component filters by
// strain name match plus confidence-tier toggle.

import { useState, useMemo } from "react";
import Link from "next/link";

interface Scan {
  id: string;
  primary_name: string | null;
  confidence: number | null;
  created_at: string | null;
}

type ConfFilter = "all" | "high" | "medium" | "low";

export default function HistoryList({ scans }: { scans: Scan[] }) {
  const [query, setQuery] = useState("");
  const [conf, setConf] = useState<ConfFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scans.filter((s) => {
      if (q) {
        const name = (s.primary_name || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (conf !== "all") {
        const c = s.confidence ?? 0;
        if (conf === "high" && c < 70) return false;
        if (conf === "medium" && (c < 40 || c >= 70)) return false;
        if (conf === "low" && c >= 40) return false;
      }
      return true;
    });
  }, [scans, query, conf]);

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 60))}
          placeholder="Search by strain name…"
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 12,
            padding: "12px 14px",
            color: "#fff",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {(["all", "high", "medium", "low"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setConf(k)}
            style={{
              padding: "6px 12px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: conf === k ? "rgba(76,175,80,0.18)" : "rgba(255,255,255,0.04)",
              border: conf === k ? "1px solid rgba(76,175,80,0.45)" : "1px solid rgba(255,255,255,0.10)",
              color: conf === k ? "#81C784" : "rgba(255,255,255,0.75)",
              textTransform: "capitalize",
            }}
          >
            {k === "all" ? "All confidence" : k}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70 text-lg">
            {query ? `No scans match "${query}"` : "No scans match this filter"}
          </p>
          <p className="text-white/50 text-sm mt-2">Try a different search term or clear the filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {filtered.length} of {scans.length} scans
          </div>
          {filtered.map((scan) => (
            <Link
              key={scan.id}
              href={`/garden/history/${scan.id}`}
              className="block rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">
                    {scan.primary_name || "Unknown Strain"}
                  </h3>
                  {scan.confidence !== null && (
                    <p className="text-white/70 text-sm mt-1">
                      {Math.round(scan.confidence)}% confidence
                    </p>
                  )}
                </div>
                {scan.created_at && (
                  <p className="text-white/50 text-xs whitespace-nowrap">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
