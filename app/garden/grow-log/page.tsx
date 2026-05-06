"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { loadGrowLogEntries, type GrowLogEntry } from "@/lib/growlog/growLogStorage";

function GrowLogContent() {
  const params = useSearchParams();
  const saved = params.get("saved");
  const [entries, setEntries] = useState<GrowLogEntry[]>([]);

  useEffect(() => {
    setEntries(loadGrowLogEntries());
  }, [saved]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-2">
        <Link
          href="/garden"
          className="text-white/50 text-sm hover:text-white"
        >
          ← Garden
        </Link>
        <Link
          href="/garden/scanner"
          className="text-xs font-semibold text-green-400"
        >
          Scan
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Grow Log</h1>
      <p className="text-white/45 text-sm mb-6">
        Timeline of scans and coaching notes — stored on this device.
      </p>

      {saved && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-100">
          Entry saved. Keep logging after each scan to track progress.
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/70 mb-2">No entries yet.</p>
          <p className="text-white/45 text-sm mb-6">
            Run a scan, then use <strong className="text-white/80">Save to Grow Log</strong>{" "}
            to add your first timeline entry.
          </p>
          <Link
            href="/garden/scanner"
            className="inline-block rounded-full px-6 py-3 font-bold bg-gradient-to-r from-green-600 to-green-800"
          >
            Start scan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`/garden/grow-log/entry/${e.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex justify-between gap-3 text-xs text-white/40 mb-1">
                <span>
                  {new Date(e.createdAt).toLocaleString()}
                </span>
                {e.topStrainName && (
                  <span className="text-green-300/80 truncate max-w-[140px]">
                    {e.topStrainName}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{e.title}</h2>
              <p className="text-white/55 text-sm line-clamp-2">{e.summary}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-white/45">
                <span className="rounded-md bg-white/5 px-2 py-0.5">{e.growthStage}</span>
                <span className="rounded-md bg-white/5 px-2 py-0.5">{e.healthStatus}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-white/10 flex justify-center gap-6 text-sm">
        <Link href="/garden/history" className="text-white/50 hover:text-white">
          Scan History
        </Link>
        <Link href="/garden/strains" className="text-white/50 hover:text-white">
          Strains
        </Link>
      </div>
    </div>
  );
}

export default function GrowLogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white px-4 py-12 max-w-lg mx-auto text-white/40 text-sm">
          Loading Grow Log…
        </div>
      }
    >
      <GrowLogContent />
    </Suspense>
  );
}
