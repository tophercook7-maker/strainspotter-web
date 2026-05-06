"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "../../_components/TopNav";
import { Alert, Snackbar } from "@mui/material";

const isDev = process.env.NODE_ENV === "development";

type Item = {
  id?: string;
  strainName: string;
  strainSlug: string;
  sourceName: string;
  sourcePageUrl: string;
  imageUrl: string;
  catalogKey?: string;
  reviewStatus: string;
  disabled: boolean;
  disabledReason: string;
  trustLevel: string;
  status: string;
  localPath: string;
  localFileExists?: boolean;
  previewUrl?: string;
  originalImageUrl?: string;
  contentHashPresent?: boolean;
  imageUrlPreview?: string;
  reviewNote?: string;
};

/** Tabs + API `status` (use `auto` on first load so the server picks the first non-empty queue). */
type TabKey = "human" | "pending-search" | "pending" | "approved" | "rejected" | "all";
type RequestStatus = TabKey | "auto";

type Dashboard = {
  humanReviewQueue: number;
  pendingExternalSearch: number;
  autoApproved: number;
  humanApproved: number;
  rejectedExternal: number;
  autoRejectedExternal: number;
  approvedEligibleForSync: number;
};

type ApiCounts = {
  pending: number;
  approved: number;
  rejected: number;
  total?: number;
  totalExternal: number;
  disabledPendingCount: number;
};

const QUICK_REJECT = [
  "Wrong strain",
  "Variant/cross",
  "Seed/marketing image",
  "Bad image",
  "Duplicate",
  "Not cannabis flower",
] as const;

function previewSrc(item: Item): string {
  if (typeof item.previewUrl === "string" && item.previewUrl.trim()) {
    return item.previewUrl;
  }
  if (item.localFileExists && item.localPath) {
    return `/api/references/preview?localPath=${encodeURIComponent(item.localPath)}`;
  }
  return item.imageUrl || "";
}

function cardKey(item: Item): string {
  return item.catalogKey || `${item.strainSlug}::${item.imageUrl}`;
}

/** Avoid cached GET responses (browser / proxies); matches API `Cache-Control: no-store`. */
const API_GET_INIT: RequestInit = { cache: "no-store" };

export default function ExternalReviewClient() {
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("auto");
  const [lastEffectiveTab, setLastEffectiveTab] = useState<TabKey | null>(null);
  const [strain, setStrain] = useState("");
  const [source, setSource] = useState("");
  const [limit] = useState(24);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalExternalCandidates, setTotalExternalCandidates] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [disabledPendingCount, setDisabledPendingCount] = useState(0);
  const [returned, setReturned] = useState(0);
  const [counts, setCounts] = useState<ApiCounts | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<{
    key: string;
    kind: "approve" | "reject" | "skip";
  } | null>(null);
  const [bulkBusy, setBulkBusy] = useState<"approve" | "reject" | "skip" | null>(null);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [toast, setToast] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });
  const [banner, setBanner] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const applyMetrics = useCallback((data: Record<string, unknown>) => {
    const c = data.counts as ApiCounts | undefined;
    if (c) setCounts(c);
    const d = data.dashboard as Dashboard | undefined;
    if (d && typeof d.humanReviewQueue === "number") setDashboard(d);
    const requested = data.requestedStatus;
    const eff = data.effectiveStatus;
    if (
      requested === "auto" &&
      (eff === "human" ||
        eff === "pending-search" ||
        eff === "pending" ||
        eff === "approved" ||
        eff === "rejected" ||
        eff === "all")
    ) {
      setLastEffectiveTab(eff as TabKey);
    }
    setTotalFiltered(Number(data.total) || 0);
    setTotalExternalCandidates(
      Number(data.totalExternalCandidates ?? c?.totalExternal) || 0
    );
    setPendingCount(Number(data.pending ?? c?.pending) || 0);
    setApprovedCount(Number(data.approved ?? c?.approved) || 0);
    setRejectedCount(Number(data.rejected ?? c?.rejected) || 0);
    setDisabledPendingCount(
      Number(data.disabledPendingCount ?? c?.disabledPendingCount) || 0
    );
    setReturned(Number(data.returned) || 0);
  }, []);

  const fetchList = useCallback(
    async (opts?: { resetToFirstPage?: boolean }) => {
      const effectiveOffset = opts?.resetToFirstPage ? 0 : offset;
      if (opts?.resetToFirstPage) setOffset(0);

      setLoading(true);
      try {
        const sp = new URLSearchParams({
          status: requestStatus,
          limit: String(limit),
          offset: String(effectiveOffset),
        });
        if (strain.trim()) sp.set("strain", strain.trim());
        if (source.trim()) sp.set("source", source.trim());
        sp.set("t", String(Date.now()));
        const res = await fetch(`/api/references/review?${sp.toString()}`, API_GET_INIT);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        if (isDev && data._debug) {
          console.log("[external-review] catalog", data._debug);
        }
        const rawItems = (data.items || []) as Item[];
        setItems(rawItems);
        applyMetrics(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setToast({
          open: true,
          severity: "error",
          message: msg,
        });
        setBanner({ kind: "error", text: msg });
      } finally {
        setLoading(false);
      }
    },
    [requestStatus, strain, source, limit, offset, applyMetrics]
  );

  const fetchPage = useCallback(() => fetchList(), [fetchList]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    if (loading) return;
    if (totalFiltered === 0) {
      if (offset !== 0) setOffset(0);
      return;
    }
    if (offset >= totalFiltered) {
      setOffset(Math.max(0, Math.floor((totalFiltered - 1) / limit) * limit));
    }
  }, [loading, totalFiltered, offset, limit]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 6000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const refreshCountsFromApi = useCallback(async () => {
    try {
      const sp = new URLSearchParams({
        status: "all",
        limit: "1",
        offset: "0",
      });
      sp.set("t", String(Date.now()));
      const res = await fetch(`/api/references/review?${sp.toString()}`, API_GET_INIT);
      const data = await res.json();
      if (res.ok) applyMetrics(data);
    } catch {
      /* ignore */
    }
  }, [applyMetrics]);

  const postAction = async (
    item: Item,
    action: "approve" | "reject" | "skip",
    reason: string
  ) => {
    const key = cardKey(item);
    setBusyAction({ key, kind: action });
    const rejectFinal =
      action === "reject" ? (reason.trim() || "Rejected in review") : "";
    const skipNote = reason.trim() || "Skipped for later";
    try {
      if (isDev) {
        console.log("[external-review] action", {
          action,
          imageUrl: item.imageUrl,
          strainSlug: item.strainSlug,
        });
      }
      const res = await fetch("/api/references/review", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: item.imageUrl,
          action,
          reason:
            action === "reject"
              ? rejectFinal
              : action === "skip"
                ? skipNote
                : "",
          strainSlug: item.strainSlug,
          catalogKey: item.catalogKey || `${item.strainSlug}::${item.imageUrl}`,
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        /* non-JSON */
      }
      if (!res.ok) {
        const err =
          typeof data.error === "string"
            ? data.error
            : `Request failed (${res.status})`;
        throw new Error(err);
      }
      const updated = Number(data.updated) || 0;
      if (updated < 1) {
        throw new Error("No catalog rows were updated. Try Refresh.");
      }
      if (data.counts) setCounts(data.counts as ApiCounts);
      await refreshCountsFromApi();
      const successMsg =
        action === "approve"
          ? `Approved ${updated} row(s).`
          : action === "reject"
            ? `Rejected ${updated} row(s).`
            : `Skipped ${updated} row(s) for later.`;
      setBanner({ kind: "success", text: successMsg });
      setToast({
        open: true,
        severity: "success",
        message: successMsg,
      });
      await fetchList({ resetToFirstPage: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setBanner({ kind: "error", text: msg });
      setToast({
        open: true,
        severity: "error",
        message: msg,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const bulkApproveVisible = useCallback(async () => {
    if (items.length === 0 || bulkBusy) return;
    setBulkBusy("approve");
    try {
      const res = await fetch("/api/references/review", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            action: "approve" as const,
            imageUrl: item.imageUrl,
            strainSlug: item.strainSlug,
            catalogKey: item.catalogKey || `${item.strainSlug}::${item.imageUrl}`,
          })),
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        /* */
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : res.statusText
        );
      }
      const updated = Number(data.updated) || 0;
      if (updated < 1) throw new Error("No catalog rows were updated.");
      if (data.counts) setCounts(data.counts as ApiCounts);
      await refreshCountsFromApi();
      const successMsg = `Approved ${updated} row(s).`;
      setBanner({ kind: "success", text: successMsg });
      setToast({ open: true, severity: "success", message: successMsg });
      await fetchList({ resetToFirstPage: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bulk approve failed";
      setBanner({ kind: "error", text: msg });
      setToast({ open: true, severity: "error", message: msg });
    } finally {
      setBulkBusy(null);
    }
  }, [items, bulkBusy, fetchList, refreshCountsFromApi]);

  const bulkRejectVisible = useCallback(async () => {
    const reason = bulkRejectReason.trim() || "Rejected in review";
    if (items.length === 0 || bulkBusy) return;
    setBulkBusy("reject");
    try {
      const res = await fetch("/api/references/review", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            action: "reject" as const,
            imageUrl: item.imageUrl,
            strainSlug: item.strainSlug,
            catalogKey: item.catalogKey || `${item.strainSlug}::${item.imageUrl}`,
            reason,
          })),
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        /* */
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : res.statusText
        );
      }
      const updated = Number(data.updated) || 0;
      if (updated < 1) throw new Error("No catalog rows were updated.");
      if (data.counts) setCounts(data.counts as ApiCounts);
      await refreshCountsFromApi();
      const successMsg = `Rejected ${updated} row(s).`;
      setBanner({ kind: "success", text: successMsg });
      setToast({ open: true, severity: "success", message: successMsg });
      await fetchList({ resetToFirstPage: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bulk reject failed";
      setBanner({ kind: "error", text: msg });
      setToast({ open: true, severity: "error", message: msg });
    } finally {
      setBulkBusy(null);
    }
  }, [items, bulkBusy, bulkRejectReason, fetchList, refreshCountsFromApi]);

  const bulkSkipVisible = useCallback(async () => {
    if (items.length === 0 || bulkBusy) return;
    setBulkBusy("skip");
    try {
      const res = await fetch("/api/references/review", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            action: "skip" as const,
            imageUrl: item.imageUrl,
            strainSlug: item.strainSlug,
            catalogKey: item.catalogKey || `${item.strainSlug}::${item.imageUrl}`,
            reason: "Skipped for later",
          })),
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        /* */
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : res.statusText
        );
      }
      const updated = Number(data.updated) || 0;
      if (updated < 1) throw new Error("No catalog rows were updated.");
      if (data.counts) setCounts(data.counts as ApiCounts);
      await refreshCountsFromApi();
      const successMsg = `Skipped ${updated} row(s) for later.`;
      setBanner({ kind: "success", text: successMsg });
      setToast({ open: true, severity: "success", message: successMsg });
      await fetchList({ resetToFirstPage: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bulk skip failed";
      setBanner({ kind: "error", text: msg });
      setToast({ open: true, severity: "error", message: msg });
    } finally {
      setBulkBusy(null);
    }
  }, [items, bulkBusy, fetchList, refreshCountsFromApi]);

  const highlightTab: TabKey | null =
    requestStatus === "auto" ? lastEffectiveTab : requestStatus;
  const showBulkActions =
    highlightTab === "human" ||
    highlightTab === "pending-search" ||
    highlightTab === "pending";

  const onRejectField = (key: string, val: string) => {
    setRejectReasons((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="min-h-[100dvh] text-white pb-24">
      <TopNav title="External reference review" />
      <div className="mx-auto max-w-5xl px-3 py-4 space-y-4">
        {banner ? (
          <div
            role="status"
            className={`rounded-lg border px-3 py-2 text-sm ${
              banner.kind === "success"
                ? "border-emerald-400/50 bg-emerald-900/30 text-emerald-100"
                : "border-red-400/50 bg-red-900/30 text-red-100"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <p className="text-sm text-white/70">
          Low-trust search hits. Pending includes disabled rows (repair queue);
          approve to enable. Approve only when the image clearly matches the
          strain. Backup written on each change:{" "}
          <code className="text-xs bg-white/10 px-1 rounded">
            reference-images.backup-before-review-change.jsonl
          </code>
        </p>

        <div className="flex flex-wrap gap-2 items-center">
          {(
            [
              ["human", "Human Review", dashboard?.humanReviewQueue ?? 0] as const,
              [
                "pending-search",
                "Pending External Search",
                dashboard?.pendingExternalSearch ?? 0,
              ] as const,
              [
                "pending",
                "Pending All",
                dashboard
                  ? dashboard.humanReviewQueue + dashboard.pendingExternalSearch
                  : 0,
              ] as const,
              [
                "approved",
                "Approved",
                dashboard
                  ? dashboard.autoApproved + dashboard.humanApproved
                  : 0,
              ] as const,
              ["rejected", "Rejected", dashboard?.rejectedExternal ?? 0] as const,
              [
                "all",
                "All",
                totalExternalCandidates || counts?.totalExternal || 0,
              ] as const,
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setOffset(0);
                setRequestStatus(key);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                highlightTab === key
                  ? "bg-sky-600 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {dashboard ? (
          <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4 space-y-2">
            <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">
              External candidates
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-amber-500/25 px-3 py-1 text-amber-100">
                Human review {dashboard.humanReviewQueue}
              </span>
              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-cyan-100">
                Pending search {dashboard.pendingExternalSearch}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100">
                Auto-approved {dashboard.autoApproved}
              </span>
              <span className="rounded-full bg-teal-500/20 px-3 py-1 text-teal-100">
                Human-approved {dashboard.humanApproved}
              </span>
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-100">
                Rejected {dashboard.rejectedExternal}
              </span>
              <span className="rounded-full bg-slate-500/25 px-3 py-1 text-slate-100">
                Auto-rejected {dashboard.autoRejectedExternal}
              </span>
              <span className="rounded-full bg-indigo-500/25 px-3 py-1 text-indigo-100">
                Eligible for sync {dashboard.approvedEligibleForSync}
              </span>
            </div>
          </div>
        ) : null}

        {(counts || totalExternalCandidates > 0) && (
          <div className="flex flex-wrap gap-3 text-sm text-white/60">
            <span>
              Catalog bucket · pending {pendingCount} · approved {approvedCount} · rejected{" "}
              {rejectedCount}
            </span>
            <span>· external rows {totalExternalCandidates}</span>
            {disabledPendingCount > 0 ? (
              <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-200">
                Disabled (pending queue) {disabledPendingCount}
              </span>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-white/60 flex flex-col gap-1">
            Strain
            <input
              value={strain}
              onChange={(e) => {
                setOffset(0);
                setStrain(e.target.value);
              }}
              placeholder="slug or name"
              className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-white text-sm w-44"
            />
          </label>
          <label className="text-xs text-white/60 flex flex-col gap-1">
            Source
            <input
              value={source}
              onChange={(e) => {
                setOffset(0);
                setSource(e.target.value);
              }}
              placeholder="e.g. brave-search"
              className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-white text-sm w-40"
            />
          </label>
          <button
            type="button"
            onClick={fetchPage}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
          >
            Refresh
          </button>
        </div>

        {!loading && showBulkActions && items.length > 0 ? (
          <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4 space-y-3">
            <p className="text-sm font-medium text-white">Bulk actions (this page only)</p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                disabled={!!bulkBusy}
                onClick={() => void bulkApproveVisible()}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {bulkBusy === "approve"
                  ? "Approving…"
                  : `Approve visible (${items.length})`}
              </button>
              <input
                type="text"
                placeholder="Bulk reject reason (optional)"
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-white text-sm min-w-[12rem] flex-1 max-w-md"
              />
              <button
                type="button"
                disabled={!!bulkBusy}
                onClick={() => void bulkRejectVisible()}
                className="rounded-lg bg-red-700/90 px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {bulkBusy === "reject"
                  ? "Rejecting…"
                  : `Reject visible (${items.length})`}
              </button>
              {highlightTab === "human" ? (
                <button
                  type="button"
                  disabled={!!bulkBusy}
                  onClick={() => void bulkSkipVisible()}
                  className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {bulkBusy === "skip"
                    ? "Skipping…"
                    : `Skip for later (${items.length})`}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 p-4 text-sm text-white/90 space-y-2">
          <p className="font-semibold text-white">Run pipeline after review</p>
          <p className="text-white/70 text-xs">
            Download, auto-review, quality, index, embeddings, and optional Supabase sync:
          </p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded bg-black/50 p-3 text-sky-100 border border-white/10">
            npm run scanner:data-engine -- --no-fetch --sync-supabase
          </pre>
          <p className="text-xs text-white/55">
            See <code className="text-white/80">SCANNER_DATA_ENGINE_AUTOMATION.md</code> for fetch +
            caps + scheduling notes.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-white/80 space-y-1 font-mono opacity-90">
          <p className="font-sans font-semibold text-white mb-2">Manual step-by-step (optional)</p>
          <p>npm run references:download</p>
          <p>npm run references:quality</p>
          <p>npm run references:index</p>
          <p>npm run references:embeddings</p>
          <p>npm run supabase:sync:references -- --limit 100</p>
        </div>

        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2 text-sm">
            <p className="text-white/90">
              No rows in this queue. Try{" "}
              <button
                type="button"
                className="text-sky-300 underline"
                onClick={() => {
                  setOffset(0);
                  setRequestStatus("pending-search");
                }}
              >
                Pending External Search
              </button>{" "}
              or{" "}
              <button
                type="button"
                className="text-sky-300 underline"
                onClick={() => {
                  setOffset(0);
                  setRequestStatus("all");
                }}
              >
                All
              </button>
              .
            </p>
            <div className="mt-3 rounded-lg bg-black/40 p-3 font-mono text-xs space-y-1 text-white/70">
              <p>totalExternalCandidates: {totalExternalCandidates}</p>
              <p>pending (catalog): {pendingCount}</p>
              <p>approved: {approvedCount}</p>
              <p>rejected: {rejectedCount}</p>
              <p>disabled in pending queue: {disabledPendingCount}</p>
              <p>
                filtered total (this tab): {totalFiltered} · returned: {returned} ·
                offset {offset} · limit {limit}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {items.map((item) => {
              const src = previewSrc(item);
              const ck = cardKey(item);
              const reason = rejectReasons[ck] ?? "";
              const busy =
                busyAction !== null &&
                busyAction.key === ck;
              const showPendingDisabledBadge =
                item.disabled === true &&
                (item.reviewStatus === "needs_review_external_search" ||
                  item.reviewStatus === "needs_human_review_external");
              const urlPrev =
                item.imageUrlPreview ||
                (item.imageUrl.length > 80
                  ? `${item.imageUrl.slice(0, 80)}…`
                  : item.imageUrl);
              const hasPath = Boolean(item.localPath && item.localPath.trim());
              const chOk = item.contentHashPresent === true;
              return (
                <article
                  key={ck}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                >
                  {showPendingDisabledBadge ? (
                    <p className="text-[11px] rounded-md bg-violet-500/25 text-violet-100 px-2 py-1 inline-block">
                      Pending review / disabled until approved
                    </p>
                  ) : null}
                  <div className="flex gap-3">
                    <div className="shrink-0 w-28 h-28 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(ev) => {
                            if (
                              item.imageUrl &&
                              ev.currentTarget.src !== item.imageUrl
                            ) {
                              ev.currentTarget.src = item.imageUrl;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-sm space-y-1">
                      <p className="font-semibold text-white truncate">
                        {String(item.strainName || item.strainSlug)}
                      </p>
                      <p className="text-white/60 text-xs truncate">
                        {item.strainSlug}
                      </p>
                      <p>
                        <span className="text-white/50">source </span>
                        {item.sourceName}
                      </p>
                      <p>
                        <span className="text-white/50">review </span>
                        {item.reviewStatus}
                      </p>
                      <p>
                        <span className="text-white/50">trust </span>
                        {item.trustLevel || "—"}
                      </p>
                      <p>
                        <span className="text-white/50">disabled </span>
                        {item.disabled ? "yes" : "no"}
                        {item.disabledReason
                          ? ` — ${item.disabledReason}`
                          : ""}
                      </p>
                      <p className="truncate">
                        <span className="text-white/50">status </span>
                        {item.status}
                      </p>
                    </div>
                  </div>
                  {isDev ? (
                    <pre className="text-[10px] leading-snug text-cyan-100/95 bg-black/55 border border-white/10 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                      {[
                        `imageUrl: ${urlPrev}`,
                        `reviewStatus: ${item.reviewStatus}`,
                        `disabled: ${item.disabled}`,
                        `status: ${item.status}`,
                        `localPath: ${hasPath}`,
                        `contentHash: ${chOk}`,
                      ].join("\n")}
                    </pre>
                  ) : null}
                  {item.reviewNote ? (
                    <p className="text-xs text-amber-100/90 bg-amber-500/15 border border-amber-500/30 rounded px-2 py-1">
                      Note: {item.reviewNote}
                    </p>
                  ) : null}
                  {item.sourcePageUrl ? (
                    <a
                      href={item.sourcePageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 break-all line-clamp-2"
                    >
                      {item.sourcePageUrl}
                    </a>
                  ) : null}
                  <p className="text-xs text-white/50 break-all">{item.imageUrl}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || bulkBusy !== null}
                      onClick={() => void postAction(item, "approve", "")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {busy && busyAction?.kind === "approve"
                        ? "Approving…"
                        : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || bulkBusy !== null}
                      onClick={() => void postAction(item, "reject", reason.trim())}
                      className="rounded-lg bg-red-600/90 px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {busy && busyAction?.kind === "reject"
                        ? "Rejecting…"
                        : "Reject"}
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        bulkBusy !== null ||
                        item.reviewStatus !== "needs_human_review_external"
                      }
                      onClick={() => void postAction(item, "skip", "Skipped for later")}
                      className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
                      title={
                        item.reviewStatus !== "needs_human_review_external"
                          ? "Skip only applies to human review queue rows"
                          : undefined
                      }
                    >
                      {busy && busyAction?.kind === "skip" ? "Skipping…" : "Skip for later"}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Reject reason (optional; defaults if empty)"
                    value={reason}
                    onChange={(e) => onRejectField(ck, e.target.value)}
                    className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
                  />
                  <div className="flex flex-wrap gap-1">
                    {QUICK_REJECT.map((label) => (
                      <button
                        key={label}
                        type="button"
                        className="text-[11px] rounded-full bg-white/10 px-2 py-0.5 hover:bg-white/20"
                        onClick={() => onRejectField(ck, label)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && items.length > 0 && totalFiltered > limit && (
          <div className="flex justify-center gap-4 pt-4">
            <button
              type="button"
              disabled={offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-white/60 py-2">
              {offset + 1}–
              {Math.min(offset + items.length, totalFiltered)} of {totalFiltered}
            </span>
            <button
              type="button"
              disabled={offset + limit >= totalFiltered}
              onClick={() => setOffset((o) => o + limit)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        <Link
          href="/garden/data-engine"
          className="inline-block text-sm text-sky-400 mt-6"
        >
          ← Data Engine
        </Link>
      </div>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
