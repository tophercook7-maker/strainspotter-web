"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopNav from "@/app/garden/_components/TopNav";
import { fetchScansHistoryForUser, fetchUnifiedScanByServerId } from "@/app/actions/scanQueries";
import { useOptionalAuth } from "@/lib/auth/AuthProvider";
import {
  getSavedScanLocal,
  listSavedScansLocalSorted,
} from "@/lib/growlog/savedScanRegistry";
import { compareSavedScans, formatScanDate } from "@/lib/scanner/compareSavedScans";
import { savedScanResultsPath } from "@/lib/scanner/savedScanNav";
import { isServerBackedSavedScanId } from "@/lib/scanner/savedScanId";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

async function loadSavedScanUnified(id: string): Promise<SavedUnifiedScan | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const local = getSavedScanLocal(trimmed);
  if (local) return local;
  if (isServerBackedSavedScanId(trimmed)) {
    const row = await fetchUnifiedScanByServerId(trimmed);
    return row?.unified ?? null;
  }
  return null;
}

type PickerRow = {
  id: string;
  title: string;
  createdAt: string | null;
};

export default function CompareScansClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;

  const scanAId = searchParams.get("a")?.trim() ?? "";
  const scanBId = searchParams.get("b")?.trim() ?? "";

  const [scanA, setScanA] = useState<SavedUnifiedScan | null>(null);
  const [scanB, setScanB] = useState<SavedUnifiedScan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerRows, setPickerRows] = useState<PickerRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const loadPair = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!scanAId) {
        setScanA(null);
        setScanB(null);
        setLoading(false);
        return;
      }
      const [a, b] = await Promise.all([
        loadSavedScanUnified(scanAId),
        scanBId ? loadSavedScanUnified(scanBId) : Promise.resolve(null),
      ]);
      setScanA(a);
      setScanB(b);
      if (!a) {
        setLoadError("Could not load the first scan. It may have been removed.");
      }
    } catch (e) {
      console.error(e);
      setLoadError("Something went wrong loading scans.");
    } finally {
      setLoading(false);
    }
  }, [scanAId, scanBId]);

  useEffect(() => {
    loadPair();
  }, [loadPair]);

  useEffect(() => {
    if (!scanAId || scanBId) return;
    let cancelled = false;
    (async () => {
      setPickerLoading(true);
      try {
        const local = listSavedScansLocalSorted();
        const server = await fetchScansHistoryForUser(userId);
        const byId = new Map<string, PickerRow>();

        for (const row of server) {
          if (row.id === scanAId) continue;
          byId.set(row.id, {
            id: row.id,
            title: row.primary_name || "Saved scan",
            createdAt: row.created_at,
          });
        }
        for (const s of local) {
          if (s.id === scanAId) continue;
          if (!byId.has(s.id)) {
            byId.set(s.id, {
              id: s.id,
              title: s.topStrainName || s.matches[0]?.name || "Saved scan",
              createdAt: s.createdAt,
            });
          }
        }

        const rows = Array.from(byId.values()).sort((x, y) => {
          const tx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
          const ty = y.createdAt ? new Date(y.createdAt).getTime() : 0;
          return ty - tx;
        });
        if (!cancelled) setPickerRows(rows);
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanAId, scanBId, userId]);

  const pickB = (id: string) => {
    router.push(`/garden/scans/compare?a=${encodeURIComponent(scanAId)}&b=${encodeURIComponent(id)}`);
  };

  if (!scanAId) {
    return (
      <>
        <TopNav title="Compare scans" showBack />
        <main className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto">
          <p className="text-white/70">Open a saved scan and choose “Compare with another scan”, or add</p>
          <code className="text-green-400 text-sm mt-2 block">?a=SCAN_ID</code>
          <p className="text-white/45 text-sm mt-4">
            <Link href="/garden/history" className="text-green-400 underline">
              Scan history
            </Link>
          </p>
        </main>
      </>
    );
  }

  if (loading && !scanA && !loadError) {
    return (
      <>
        <TopNav title="Compare scans" showBack />
        <main className="min-h-screen bg-black text-white px-4 py-8">
          <p className="text-white/50 text-sm">Loading scans…</p>
        </main>
      </>
    );
  }

  if (loadError || !scanA) {
    return (
      <>
        <TopNav title="Compare scans" showBack />
        <main className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto text-center">
          <p className="text-white/80">{loadError ?? "Scan not found."}</p>
          <Link href="/garden/history" className="text-green-400 mt-6 inline-block">
            Back to history
          </Link>
        </main>
      </>
    );
  }

  if (!scanBId) {
    return (
      <>
        <TopNav title="Pick a scan" showBack />
        <main className="min-h-screen bg-black text-white">
          <div className="mx-auto w-full max-w-[560px] px-4 py-6">
            <p className="text-white/80 text-sm mb-2">
              Comparing from <span className="text-white font-semibold">scan A</span> — choose another
              save:
            </p>
            <p className="text-white/45 text-xs mb-4 line-clamp-2">
              {scanA.matches[0]?.name ?? scanA.topStrainName ?? "Scan"} ·{" "}
              {formatScanDate(scanA.createdAt)}
            </p>
            {pickerLoading ? (
              <p className="text-white/50 text-sm">Loading your saves…</p>
            ) : pickerRows.length === 0 ? (
              <p className="text-white/60 text-sm">
                No other saved scans found. Save another scan from the scanner first.
              </p>
            ) : (
              <ul className="space-y-2">
                {pickerRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => pickB(row.id)}
                      className="w-full text-left rounded-lg border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="font-semibold text-white truncate">{row.title}</div>
                      {row.createdAt && (
                        <div className="text-white/45 text-xs mt-1">
                          {formatScanDate(row.createdAt)}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/garden/history"
              className="inline-block mt-6 text-sm text-green-400/90 underline"
            >
              Open full history
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!scanB) {
    return (
      <>
        <TopNav title="Compare scans" showBack />
        <main className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto">
          <p className="text-white/70">Could not load the second scan.</p>
          <button
            type="button"
            onClick={() => router.push(`/garden/scans/compare?a=${encodeURIComponent(scanAId)}`)}
            className="mt-4 text-green-400 underline text-sm"
          >
            Pick a different scan
          </button>
        </main>
      </>
    );
  }

  const renderScanCard = (label: string, s: SavedUnifiedScan, variant: "earlier" | "later") => (
    <div
      className={`rounded-xl border p-4 ${
        variant === "earlier"
          ? "border-blue-500/25 bg-blue-500/5"
          : "border-green-500/25 bg-green-500/5"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{label}</div>
      <div className="text-xs text-white/50 mb-3">{formatScanDate(s.createdAt)}</div>
      <div className="text-lg font-bold text-white mb-1">
        {s.matches[0]?.name ?? s.topStrainName ?? "—"}
      </div>
      {s.matches[0]?.confidence != null && (
        <div className="text-sm text-white/70 mb-3">
          Top match ~{Math.round(s.matches[0].confidence)}% · {s.matches[0].confidenceLabel}
        </div>
      )}
      {s.apiScanSummary?.trim() && (
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">
            Summary
          </div>
          <p className="text-sm text-white/75 leading-relaxed line-clamp-6">{s.apiScanSummary.trim()}</p>
        </div>
      )}
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">Top 3</div>
      <ol className="space-y-1 text-sm text-white/80">
        {s.matches.slice(0, 3).map((m) => (
          <li key={m.rank}>
            {m.rank}. {m.name}{" "}
            <span className="text-white/45">~{Math.round(m.confidence)}%</span>
          </li>
        ))}
        {s.matches.length === 0 && <li className="text-white/40">No ranked matches stored</li>}
      </ol>
      <div className="mt-3 pt-3 border-t border-white/10 text-sm text-white/65 space-y-1">
        <div>
          <span className="text-white/40">Type: </span>
          {s.plantAnalysis?.typeEstimate?.label ?? "—"}
        </div>
        <div>
          <span className="text-white/40">Stage: </span>
          {s.plantAnalysis?.growthStage?.label ?? "—"}
        </div>
        <div>
          <span className="text-white/40">Health: </span>
          {s.plantAnalysis?.health?.label ?? "—"}
        </div>
      </div>
      <Link
        href={savedScanResultsPath(s.id)}
        className="inline-block mt-3 text-xs font-semibold text-green-400/90 underline"
      >
        Open this scan
      </Link>
    </div>
  );

  const ta = new Date(scanA.createdAt).getTime();
  const tb = new Date(scanB.createdAt).getTime();
  const earlier = !Number.isNaN(ta) && !Number.isNaN(tb) && ta <= tb ? scanA : scanB;
  const later = earlier === scanA ? scanB : scanA;
  const cmp = compareSavedScans(earlier, later);

  return (
    <>
      <TopNav title="Compare scans" showBack />
      <main className="min-h-screen bg-black text-white pb-24">
        <div className="mx-auto w-full max-w-[900px] px-4 py-6">
          <p className="text-white/55 text-sm mb-6">
            Earlier vs later by save time. “What changed” compares the <strong>later</strong> scan to
            the <strong>earlier</strong> one.
          </p>

          <section className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-200/90 mb-3">
              What changed
            </h2>
            <ul className="space-y-2 text-sm text-white/85 leading-relaxed">
              {cmp.notes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-400/90 shrink-0">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            {renderScanCard("Earlier save", earlier, "earlier")}
            {renderScanCard("Later save", later, "later")}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(`/garden/scans/compare?a=${encodeURIComponent(scanAId)}`)
              }
              className="text-sm font-semibold text-white/80 underline"
            >
              Compare A with a different scan
            </button>
            <Link href="/garden/history" className="text-sm font-semibold text-green-400/90 underline">
              Scan history
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
