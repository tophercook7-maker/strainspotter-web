"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { fetchSavedScanForCompose } from "@/app/actions/scanQueries";
import {
  appendGrowLogEntry,
  clearComposeDraft,
  loadComposeDraft,
  newId,
  setComposeDraft,
  type GrowLogEntry,
} from "@/lib/growlog/growLogStorage";
import { growLogComposeDraftFromSaved } from "@/lib/growlog/composeDraftFromSaved";
import { getSavedScanLocal, linkGrowLogEntryToScan, upsertSavedScanLocal } from "@/lib/growlog/savedScanRegistry";
import {
  attachGrowLogEntryToPlant,
  getPlantById,
  listPlantsSortedByUpdated,
} from "@/lib/growlog/plantStorage";
import { isServerBackedSavedScanId } from "@/lib/scanner/savedScanId";

function applyDraftToForm(
  draft: NonNullable<ReturnType<typeof loadComposeDraft>>,
  setters: {
    setTitle: (s: string) => void;
    setSummary: (s: string) => void;
    setNotes: (s: string) => void;
    setGrowthStage: (s: string) => void;
    setHealthStatus: (s: string) => void;
    setIssues: (s: string) => void;
    setActions: (s: string) => void;
    setWatch: (s: string) => void;
    setFollow: (s: string) => void;
  }
) {
  const ls = draft.snapshot.growCoach.logSupport;
  setters.setTitle(ls?.suggestedEntryTitle ?? "Grow log entry");
  setters.setSummary(ls?.suggestedSummary ?? "");
  setters.setGrowthStage(ls?.suggestedFields.growthStage ?? "");
  setters.setHealthStatus(ls?.suggestedFields.healthStatus ?? "");
  setters.setIssues((ls?.suggestedFields.possibleIssues ?? []).join("\n"));
  setters.setActions((ls?.suggestedFields.recommendedActions ?? []).join("\n"));
  setters.setWatch((ls?.suggestedFields.watchFor ?? []).join("\n"));
  setters.setFollow(ls?.followUpSuggestion ?? "");
  setters.setNotes(draft.userNotes ?? "");
}

type LoadState = "pending" | "ready" | "empty";

function GrowLogComposeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [issues, setIssues] = useState("");
  const [actions, setActions] = useState("");
  const [watch, setWatch] = useState("");
  const [follow, setFollow] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("pending");
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setters = {
      setTitle,
      setSummary,
      setNotes,
      setGrowthStage,
      setHealthStatus,
      setIssues,
      setActions,
      setWatch,
      setFollow,
    };

    (async () => {
      const scanIdRaw = searchParams.get("scanId");

      if (scanIdRaw) {
        const scanId = decodeURIComponent(scanIdRaw);
        const localSaved = getSavedScanLocal(scanId);
        if (localSaved) {
          const draft = growLogComposeDraftFromSaved(localSaved);
          setComposeDraft(draft);
          applyDraftToForm(draft, setters);
          if (!cancelled) setLoadState("ready");
          return;
        }

        if (isServerBackedSavedScanId(scanId)) {
          try {
            const serverSaved = await fetchSavedScanForCompose(scanId);
            if (!cancelled && serverSaved) {
              if (!getSavedScanLocal(serverSaved.id)) {
                upsertSavedScanLocal(serverSaved);
              }
              const draft = growLogComposeDraftFromSaved(serverSaved);
              setComposeDraft(draft);
              applyDraftToForm(draft, setters);
              setLoadState("ready");
              return;
            }
          } catch {
            /* fall through to session draft — no noisy error */
          }
        }
      }

      const draft = loadComposeDraft();
      if (cancelled) return;
      if (draft) {
        applyDraftToForm(draft, setters);
        setLoadState("ready");
      } else {
        setLoadState("empty");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (loadState !== "ready") return;
    const d = loadComposeDraft();
    if (!d) return;
    setSelectedPlantId(
      d.selectedPlantId ?? d.snapshot.linkedPlantId ?? null
    );
  }, [loadState]);

  const handleSave = () => {
    const draft = loadComposeDraft();
    if (!draft) return;
    const ls = draft.snapshot.growCoach.logSupport;
    const topName = draft.snapshot.matches[0]?.name;
    const sourceScanId = draft.snapshot.savedScanId ?? draft.snapshot.id;
    const sourceScope = draft.snapshot.savedScanScope;
    const plant = selectedPlantId ? getPlantById(selectedPlantId) : null;
    const entry: GrowLogEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      title: title.trim() || "Grow log entry",
      summary: summary.trim(),
      growthStage: growthStage.trim(),
      healthStatus: healthStatus.trim(),
      possibleIssues: issues
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      recommendedActions: actions
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      watchFor: watch
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      followUpSuggestion: follow.trim() || undefined,
      coachNotes: [
        draft.snapshot.growCoach.priorityActions.length
          ? `Priority: ${draft.snapshot.growCoach.priorityActions.join(" · ")}`
          : "",
        notes.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
      tags: ls?.tags ?? [],
      topStrainName: topName,
      sourceTopStrain: topName,
      source: "scan",
      scanSessionId: draft.snapshot.id,
      sourceScanId,
      sourceScanScope: sourceScope,
      sourceScanSummary: ls?.suggestedSummary ?? draft.snapshot.growCoach.headline,
      sourceScanCreatedAt: draft.snapshot.capturedAt,
      imageDataUrls: draft.imageDataUrls ?? draft.snapshot.imageDataUrls,
      ...(selectedPlantId && plant
        ? { plantId: selectedPlantId, plantName: plant.name }
        : {}),
    };
    appendGrowLogEntry(entry);
    linkGrowLogEntryToScan(sourceScanId, entry.id);
    if (selectedPlantId && plant) {
      attachGrowLogEntryToPlant(selectedPlantId, entry.id);
    }
    clearComposeDraft();
    router.push(`/garden/grow-log?saved=${encodeURIComponent(entry.id)}`);
  };

  if (loadState === "pending") {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-10 max-w-lg mx-auto">
        <p className="text-white/50 text-sm text-center">Loading…</p>
      </div>
    );
  }

  if (loadState === "empty") {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-10 max-w-lg mx-auto">
        <p className="text-white/70 text-center">
          No draft loaded. Start from{" "}
          <Link href="/garden/scanner" className="text-green-400 underline">
            Scan Results
          </Link>{" "}
          or open a saved scan from{" "}
          <Link href="/garden/history" className="text-green-400 underline">
            Scan History
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/garden/scanner"
          className="text-white/50 text-sm hover:text-white"
        >
          ← Scan Results
        </Link>
        <span className="text-xs text-white/40">Grow Log</span>
      </div>
      <h1 className="text-xl font-bold mb-1">Review & save</h1>
      <p className="text-white/50 text-sm mb-6">
        Edit the prefilled notes, then save to your Grow Log timeline.
      </p>

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Plant (optional)
      </label>
      <select
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-white text-sm"
        value={selectedPlantId ?? ""}
        onChange={(e) =>
          setSelectedPlantId(e.target.value ? e.target.value : null)
        }
      >
        <option value="">Continue without plant</option>
        {listPlantsSortedByUpdated().map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname ? `${p.name} · ${p.nickname}` : p.name}
          </option>
        ))}
      </select>

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Title
      </label>
      <input
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-white"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Summary
      </label>
      <textarea
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-white min-h-[88px]"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Growth stage</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm"
            value={growthStage}
            onChange={(e) => setGrowthStage(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Health</label>
          <input
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm"
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value)}
          />
        </div>
      </div>

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Possible issues (one per line)
      </label>
      <textarea
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-white min-h-[72px] text-sm"
        value={issues}
        onChange={(e) => setIssues(e.target.value)}
      />

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Recommended actions (one per line)
      </label>
      <textarea
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-white min-h-[72px] text-sm"
        value={actions}
        onChange={(e) => setActions(e.target.value)}
      />

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        What to watch (one per line)
      </label>
      <textarea
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-white min-h-[72px] text-sm"
        value={watch}
        onChange={(e) => setWatch(e.target.value)}
      />

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Follow-up
      </label>
      <input
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4 text-sm"
        value={follow}
        onChange={(e) => setFollow(e.target.value)}
      />

      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1">
        Your notes
      </label>
      <textarea
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-8 text-white min-h-[80px] text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Environment tweaks, feed changes, observations…"
      />

      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3 rounded-full font-bold bg-gradient-to-r from-green-600 to-green-800 text-white shadow-lg"
      >
        Save to Grow Log
      </button>
    </div>
  );
}

export default function GrowLogComposePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white px-4 py-10 max-w-lg mx-auto">
          <p className="text-white/50 text-sm text-center">Loading…</p>
        </div>
      }
    >
      <GrowLogComposeInner />
    </Suspense>
  );
}
