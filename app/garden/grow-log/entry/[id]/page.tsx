"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { loadGrowLogEntries, type GrowLogEntry } from "@/lib/growlog/growLogStorage";
import { resolveGrowGroupLabelForPlant } from "@/lib/growlog/growGroupStorage";
import {
  getPlantById,
  listPlantsSortedByUpdated,
  reassignGrowLogEntryToPlant,
  unlinkGrowLogEntryFromPlant,
} from "@/lib/growlog/plantStorage";
import { savedScanResultsPath } from "@/lib/scanner/savedScanNav";

export default function GrowLogEntryPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<GrowLogEntry | null>(null);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reloadEntry = useCallback(() => {
    const list = loadGrowLogEntries();
    const found = list.find((e) => e.id === id);
    if (!found) setMissing(true);
    else setEntry(found);
  }, [id]);

  useEffect(() => {
    reloadEntry();
    setLoaded(true);
  }, [id, reloadEntry]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-12 max-w-lg mx-auto">
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    );
  }

  if (missing || !entry) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-12 text-center max-w-lg mx-auto">
        <p className="text-white/60">Entry not found.</p>
        <Link href="/garden/grow-log" className="text-green-400 mt-4 inline-block">
          ← Grow Log
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <Link href="/garden/grow-log" className="text-white/50 text-sm hover:text-white mb-6 inline-block">
        ← Grow Log
      </Link>
      <p className="text-xs text-white/40 mb-2">
        {new Date(entry.createdAt).toLocaleString()}
      </p>
      <h1 className="text-2xl font-bold mb-2">{entry.title}</h1>
      {entry.topStrainName && (
        <p className="text-green-300/90 text-sm mb-4">Likely match: {entry.topStrainName}</p>
      )}

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 mb-6 text-sm">
        <div className="text-[10px] uppercase text-emerald-200/50 mb-1">Linked plant</div>
        {entry.plantId && (entry.plantName || getPlantById(entry.plantId)?.name) ? (
          <p className="text-emerald-100/95 text-sm mb-3">
            Linked to{" "}
            <Link
              href={`/garden/plants/${encodeURIComponent(entry.plantId)}`}
              className="font-semibold text-emerald-200 hover:text-emerald-100 underline"
            >
              {entry.plantName ?? getPlantById(entry.plantId)?.name ?? "Plant"}
            </Link>
          </p>
        ) : (
          <p className="text-white/45 text-sm mb-3">Not linked to a plant.</p>
        )}
        {entry.plantId &&
          (() => {
            const pl = getPlantById(entry.plantId);
            const gl = pl ? resolveGrowGroupLabelForPlant(pl) : null;
            return gl ? (
              <p className="text-xs text-emerald-200/55 mb-3">Group · {gl}</p>
            ) : null;
          })()}
        <label className="block text-[10px] uppercase text-emerald-200/40 mb-1">Change plant</label>
        <select
          aria-label="Change plant"
          className="w-full rounded-lg bg-black/30 border border-emerald-500/25 px-3 py-2 text-sm text-white mb-2"
          value={entry.plantId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) unlinkGrowLogEntryFromPlant(entry.id);
            else reassignGrowLogEntryToPlant(entry.id, v);
            reloadEntry();
          }}
        >
          <option value="">Remove plant</option>
          {listPlantsSortedByUpdated().map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname ? `${p.name} · ${p.nickname}` : p.name}
            </option>
          ))}
        </select>
        <Link href="/garden/plants" className="text-xs text-emerald-300/90 font-medium">
          Create new plant →
        </Link>
      </div>

      {entry.sourceScanId && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6 text-sm">
          <div className="text-[10px] uppercase text-white/35 mb-1">From scan</div>
          {entry.sourceScanCreatedAt && (
            <p className="text-white/60 mb-3">
              {new Date(entry.sourceScanCreatedAt).toLocaleString()}
            </p>
          )}
          {entry.sourceScanSummary && (
            <p className="text-white/55 text-xs leading-relaxed mb-3 line-clamp-4">
              {entry.sourceScanSummary}
            </p>
          )}
          <Link
            href={savedScanResultsPath(entry.sourceScanId)}
            className="inline-block font-semibold text-green-400 hover:text-green-300"
          >
            View source scan →
          </Link>
        </div>
      )}
      <p className="text-white/70 text-sm leading-relaxed mb-6">{entry.summary}</p>

      <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-[10px] uppercase text-white/35 mb-1">Growth stage</div>
          <div className="text-white">{entry.growthStage}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-[10px] uppercase text-white/35 mb-1">Health</div>
          <div className="text-white">{entry.healthStatus}</div>
        </div>
      </div>

      {entry.possibleIssues.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white/35 mb-2">
            Possible issues
          </h2>
          <ul className="list-disc pl-5 text-sm text-white/65 space-y-1">
            {entry.possibleIssues.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {entry.recommendedActions.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-green-300/60 mb-2">
            Recommended actions
          </h2>
          <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
            {entry.recommendedActions.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {entry.watchFor.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white/35 mb-2">
            What to watch
          </h2>
          <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
            {entry.watchFor.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {entry.followUpSuggestion && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6 text-sm text-white/65">
          <span className="text-[10px] uppercase text-white/35 block mb-1">Follow-up</span>
          {entry.followUpSuggestion}
        </div>
      )}

      {entry.coachNotes && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white/35 mb-2">
            Coach & your notes
          </h2>
          <p className="text-sm text-white/55 whitespace-pre-wrap">{entry.coachNotes}</p>
        </section>
      )}

      {entry.imageDataUrls && entry.imageDataUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {entry.imageDataUrls.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="w-24 h-24 object-cover rounded-lg border border-white/10"
            />
          ))}
        </div>
      )}

      <Link
        href={
          entry.plantId
            ? `/garden/scanner?plantId=${encodeURIComponent(entry.plantId)}`
            : "/garden/scanner"
        }
        className="inline-block w-full text-center py-3 rounded-full font-bold bg-white/10 border border-white/15"
      >
        {entry.plantId ? "Scan this plant again" : "Scan again"}
      </Link>
    </div>
  );
}
