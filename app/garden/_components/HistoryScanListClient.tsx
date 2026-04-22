"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchScansHistoryForUser } from "@/app/actions/scanQueries";
import { useOptionalAuth } from "@/lib/auth/AuthProvider";
import { getSavedScanLocal, listSavedScansLocalSorted } from "@/lib/growlog/savedScanRegistry";
import { savedScanResultsPath } from "@/lib/scanner/savedScanNav";
import type { ScanHistoryRow } from "@/app/actions/scanQueries";
import { resolveGrowGroupLabelForPlant } from "@/lib/growlog/growGroupStorage";
import { getPlantById } from "@/lib/growlog/plantStorage";

export type HistoryScanListClientProps = {
  strainFilter?: string;
};

function snippetFromApiSummary(s: string | undefined, maxLen = 80): string | null {
  if (!s?.trim()) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

type MergedCard = {
  id: string;
  title: string;
  confidence: number | null;
  createdAt: string | null;
  linkedLogCount: number;
  hasUnified: boolean;
  /** Short line under the title (API summary when available). */
  subtitle: string | null;
  plantId?: string;
  plantLabel?: string;
  groupLabel?: string;
};

function mergeRows(server: ScanHistoryRow[]): MergedCard[] {
  const localScans = listSavedScansLocalSorted();
  const byId = new Map<string, MergedCard>();

  for (const s of server) {
    const local = getSavedScanLocal(s.id);
    const linked =
      local?.linkedGrowLogEntryIds?.length ?? s.linkedLogCount ?? 0;
    const pid =
      local?.linkedPlantId ?? s.linkedPlantId ?? undefined;
    const plantLabel =
      pid &&
      (local?.linkedPlantName?.trim() ||
        s.linkedPlantName?.trim() ||
        getPlantById(pid)?.name ||
        undefined);
    const plantRow = pid ? getPlantById(pid) : null;
    const groupLabel = plantRow ? resolveGrowGroupLabelForPlant(plantRow) : undefined;
    byId.set(s.id, {
      id: s.id,
      title: s.primary_name || local?.topStrainName || "Unknown strain",
      confidence: s.confidence ?? local?.matches[0]?.confidence ?? null,
      createdAt: s.created_at ?? local?.createdAt ?? null,
      linkedLogCount: linked,
      hasUnified: s.hasUnified || !!local,
      subtitle:
        s.summary_snippet ?? snippetFromApiSummary(local?.apiScanSummary) ?? null,
      plantId: pid,
      plantLabel: plantLabel || undefined,
      groupLabel: groupLabel || undefined,
    });
  }

  for (const loc of localScans) {
    if (byId.has(loc.id)) continue;
    const pid = loc.linkedPlantId ?? undefined;
    const plantLabel =
      pid &&
      (loc.linkedPlantName?.trim() || getPlantById(pid)?.name || undefined);
    const plantRow = pid ? getPlantById(pid) : null;
    const groupLabel = plantRow ? resolveGrowGroupLabelForPlant(plantRow) : undefined;
    byId.set(loc.id, {
      id: loc.id,
      title: loc.topStrainName || loc.matches[0]?.name || "Saved scan",
      confidence: loc.matches[0]?.confidence ?? null,
      createdAt: loc.createdAt,
      linkedLogCount: loc.linkedGrowLogEntryIds?.length ?? 0,
      hasUnified: true,
      subtitle: snippetFromApiSummary(loc.apiScanSummary),
      plantId: pid,
      plantLabel: plantLabel || undefined,
      groupLabel: groupLabel || undefined,
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

export default function HistoryScanListClient({ strainFilter }: HistoryScanListClientProps) {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [serverRows, setServerRows] = useState<ScanHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchScansHistoryForUser(userId);
        if (!cancelled) setServerRows(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const cards = useMemo(() => {
    let m = mergeRows(serverRows);
    if (strainFilter?.trim()) {
      const q = strainFilter.trim().toLowerCase();
      m = m.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.subtitle && c.subtitle.toLowerCase().includes(q))
      );
    }
    return m;
  }, [serverRows, strainFilter]);

  if (loading && serverRows.length === 0) {
    return (
      <p className="text-white/50 text-sm py-8 text-center">Loading scan history…</p>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70 text-lg">
          {strainFilter ? `No scans found for “${strainFilter}”` : "No scans yet"}
        </p>
        <p className="text-white/50 text-sm mt-2">
          {strainFilter
            ? "Try a different strain or clear the filter"
            : "Scans you save appear here and stay linked to Grow Log."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((scan) => {
        const href = savedScanResultsPath(scan.id);
        const linked = scan.linkedLogCount > 0;
        return (
          <div
            key={scan.id}
            className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors"
          >
            <Link href={href} className="block cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-lg truncate">
                    {scan.title}
                  </h3>
                  {scan.subtitle && (
                    <p className="text-white/40 text-sm mt-1 line-clamp-2 leading-snug">
                      {scan.subtitle}
                    </p>
                  )}
                  {scan.confidence !== null && (
                    <p className="text-white/70 text-sm mt-1">
                      {Math.round(scan.confidence)}% confidence
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                        linked
                          ? "bg-green-500/20 text-green-200/90"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {linked ? "Linked to Grow Log" : "Not yet logged"}
                    </span>
                    {!scan.hasUnified && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/15 text-amber-100/80">
                        Legacy snapshot
                      </span>
                    )}
                  </div>
                </div>
                {scan.createdAt && (
                  <p className="text-white/50 text-xs whitespace-nowrap shrink-0">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </Link>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {scan.plantId && scan.plantLabel && (
                <Link
                  href={`/garden/plants/${encodeURIComponent(scan.plantId)}`}
                  className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded bg-emerald-500/15 text-emerald-200/90 hover:bg-emerald-500/25"
                >
                  Plant · {scan.plantLabel}
                </Link>
              )}
              {scan.groupLabel && (
                <span className="text-[11px] font-medium px-2 py-1 rounded bg-white/5 text-white/45">
                  Group · {scan.groupLabel}
                </span>
              )}
              <Link
                href={href}
                className="text-sm font-semibold text-green-400 hover:text-green-300"
              >
                Open results →
              </Link>
              {!linked && scan.hasUnified && (
                <Link
                  href={`/garden/grow-log/compose?scanId=${encodeURIComponent(scan.id)}`}
                  className="text-sm font-semibold text-white/60 hover:text-white/90"
                >
                  Save to Grow Log
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
