"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import SSBadge from "@/components/ui/SSBadge";
import SSButton from "@/components/ui/SSButton";
import SSCard from "@/components/ui/SSCard";
import SSNotice from "@/components/ui/SSNotice";
import SSSectionHeader from "@/components/ui/SSSectionHeader";
import SSStatCard from "@/components/ui/SSStatCard";

type ScrapeTargets = {
  version: number;
  active: boolean;
  mode: string;
  reviewMode?: "manual-review" | "auto-sort" | "auto-sort-safe";
  filterMode?: "strict" | "review-borderline";
  maxImagesPerStrain: number;
  maxPagesPerRun: number;
  clusters: Record<string, unknown>;
  selectedStrains: string[];
};

type ScrapeStatus = {
  running: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  lastAction: string | null;
  currentSource: string | null;
  currentStrain: string | null;
  processedPages: number;
  downloadedImages: number;
  imageUrlsFound?: number;
  attemptedDownloads?: number;
  sentToReview?: number;
  autoTraining?: number;
  autoEval?: number;
  autoRejected?: number;
  autoReview?: number;
  autoSetAside?: number;
  bestReviewCandidates?: number;
  imagesSkipped?: number;
  skippedImages?: number;
  rejectedImages?: number;
  rejectionReasons?: Record<string, number>;
  filterMode?: "strict" | "review-borderline";
  reviewMode?: "manual-review" | "auto-sort" | "auto-sort-safe";
  readySources?: number;
  totalSources?: number;
  errors: Array<{ message?: string; sourceId?: string; sourceUrl?: string; at?: string }>;
  lastError?: string | null;
  log?: string[];
  recentEvents?: Array<{ at?: string; message: string }>;
  stopRequested: boolean;
};

type SourceRow = {
  id: string;
  name?: string;
  enabled: boolean;
  type?: string;
  sourceType?: string;
  licenseNotes?: string;
  status: "Ready" | "Disabled" | "Needs setup";
  issues: string[];
};

type ReviewCandidate = {
  id?: string;
  fileName: string;
  fileKey?: string;
  imageUrl?: string | null;
  imageSrc: string | null;
  strainSlug?: string;
  sourceId?: string;
  queryUsed?: string;
  qualityWarnings?: string[];
  qualityScore?: number;
  learnedReasons?: string[];
  reviewPriority?: "high" | "medium" | "low";
  recommendedAction?: string;
  reviewStatus?: string;
};

type ControlData = {
  scrapeTargets: ScrapeTargets;
  sources: SourceRow[];
  sourceRegistry: {
    enabledSourcesCount: number;
    readyPhotoSourcesCount?: number;
    noReadySources?: boolean;
    noSourcesEnabled: boolean;
  };
  scrapeStatus: ScrapeStatus;
  recentScrapeRuns: unknown[];
  recentResults: {
    imagesDownloadedThisRun: number;
    imagesFoundThisRun?: number;
    imagesSentToReviewThisRun?: number;
    imagesAutoTrainingThisRun?: number;
    imagesAutoEvalThisRun?: number;
    imagesAutoRejectedThisRun?: number;
    imagesAutoReviewThisRun?: number;
    bestReviewCandidatesThisRun?: number;
    imagesAutoSetAsideThisRun?: number;
    imagesRejectedThisRun?: number;
    rejectionReasons?: Record<string, number>;
    filterMode?: "strict" | "review-borderline";
    reviewMode?: "manual-review" | "auto-sort" | "auto-sort-safe";
    imagesSkippedThisRun: number;
    candidateImagesWaitingForReview: number;
    topStrainsCollected: Array<{ slug: string; count: number }>;
    sourceErrors: Array<{ message?: string; sourceId?: string; at?: string }>;
  };
  imageCandidateCounts: {
    total: number;
    byStrain: Record<string, number>;
    bySource: Record<string, number>;
  };
  reviewQueue?: {
    totalPending: number;
    totalAvailable?: number;
    hiddenLowerPriority?: number;
    setAside?: number;
    candidates: ReviewCandidate[];
  };
  pendingReviewCandidates?: ReviewCandidate[];
  reviewDecisionCounts?: {
    training: number;
    eval: number;
    reject: number;
  };
  reviewPreferences?: {
    updatedAt?: string | null;
    approvedSignals?: Record<string, { count?: number; weight?: number }>;
    rejectedSignals?: Record<string, { count?: number; weight?: number }>;
    sourceScores?: Record<string, { approved?: number; rejected?: number; weight?: number }>;
    summaries?: {
      approvedPatterns?: string[];
      rejectedPatterns?: string[];
      trustedSources?: string[];
      rejectedReasons?: string[];
    };
  };
  storage?: {
    label: string;
    message: string;
    root?: string;
    inboxPath?: string;
    configuredMissing: boolean;
    isExternal: boolean;
  };
};

const defaultTargetText = [
  "blackberry",
  "purple-afghan",
  "purple-punch",
  "purple-kush",
  "granddaddy-purple",
  "grape-ape",
].join("\n");

function slugifyInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function displaySlug(value?: string | null) {
  if (!value) return "None";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sourceTypeLabel(value?: string) {
  if (value === "metadata-and-images") return "strain info + photos";
  if (value === "metadata") return "strain info";
  if (value === "images") return "photos";
  return value ?? "unknown";
}

function reviewModeLabel(value?: string) {
  if (value === "manual-review") return "Manual review";
  if (value === "auto-sort") return "Auto-sort";
  return "Auto-sort safe";
}

export default function DataEngineDashboardClient() {
  const [data, setData] = useState<ControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [targetText, setTargetText] = useState(defaultTargetText);
  const [savingTargets, setSavingTargets] = useState(false);
  const [sourceSavingId, setSourceSavingId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, string>>({});
  const [reviewSavingId, setReviewSavingId] = useState<string | null>(null);
  const [afterReviewAction, setAfterReviewAction] = useState<"review" | "learn" | "build" | "audit" | null>(null);
  const [afterReviewStep, setAfterReviewStep] = useState<"reviewing" | "choices-saved" | "learned" | "brain-updated" | "progress-checked">("reviewing");
  const reviewQueueRef = useRef<HTMLElement | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null);

  async function loadControl() {
    try {
      const response = await fetch("/api/data-engine/scrape/control", { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load scraper controls (${response.status})`);
      const payload = (await response.json()) as ControlData;
      setData(payload);
      setTargetText((payload.scrapeTargets.selectedStrains.length ? payload.scrapeTargets.selectedStrains : defaultTargetText.split("\n")).join("\n"));
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Could not load scraper controls.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadControl();
  }, []);

  useEffect(() => {
    if (!data?.scrapeStatus.running) return;
    const interval = window.setInterval(() => {
      void loadControl();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [data?.scrapeStatus.running]);

  const targetStrains = useMemo(() => {
    return Array.from(new Set(targetText.split(/\r?\n/).map(slugifyInput).filter(Boolean)));
  }, [targetText]);

  const readyPhotoSourceCount =
    data?.sourceRegistry.readyPhotoSourcesCount ??
    data?.sources.filter(
      (source) => source.enabled && source.status === "Ready" && String(source.sourceType ?? "").includes("images")
    ).length ??
    0;
  const running = data?.scrapeStatus.running === true;
  const reviewMode = data?.scrapeStatus.reviewMode ?? data?.scrapeTargets.reviewMode ?? "auto-sort-safe";
  const autoSortOn = reviewMode === "auto-sort" || reviewMode === "auto-sort-safe";
  const pendingReviewCandidates = data?.pendingReviewCandidates ?? data?.reviewQueue?.candidates ?? [];
  const pendingReviewCount = data?.reviewQueue?.totalPending ?? pendingReviewCandidates.length;
  const totalAvailableReviewCount = data?.reviewQueue?.totalAvailable ?? pendingReviewCount;
  const lowerPriorityHiddenCount = data?.reviewQueue?.hiddenLowerPriority ?? 0;
  const setAsideCount = data?.reviewQueue?.setAside ?? data?.recentResults.imagesAutoSetAsideThisRun ?? 0;
  const sentToReviewCount =
    data?.recentResults.imagesSentToReviewThisRun ?? data?.scrapeStatus.sentToReview ?? data?.recentResults.imagesDownloadedThisRun ?? 0;
  const autoTrainingCount = data?.recentResults.imagesAutoTrainingThisRun ?? data?.scrapeStatus.autoTraining ?? 0;
  const autoEvalCount = data?.recentResults.imagesAutoEvalThisRun ?? data?.scrapeStatus.autoEval ?? 0;
  const autoRejectedCount = data?.recentResults.imagesAutoRejectedThisRun ?? data?.scrapeStatus.autoRejected ?? data?.scrapeStatus.rejectedImages ?? 0;
  const autoReviewCount = data?.recentResults.imagesAutoReviewThisRun ?? data?.scrapeStatus.autoReview ?? pendingReviewCount;
  const reviewListMissing = sentToReviewCount > 0 && pendingReviewCount === 0;
  const localReviewCounts = Object.values(reviewDecisions).reduce(
    (counts, decision) => {
      if (decision === "training") counts.training += 1;
      else if (decision === "eval") counts.eval += 1;
      else if (decision === "reject") counts.reject += 1;
      return counts;
    },
    { training: 0, eval: 0, reject: 0 }
  );
  const persistedReviewCounts = data?.reviewDecisionCounts ?? { training: 0, eval: 0, reject: 0 };
  const reviewCounts = {
    training: localReviewCounts.training + persistedReviewCounts.training,
    eval: localReviewCounts.eval + persistedReviewCounts.eval,
    reject: localReviewCounts.reject + persistedReviewCounts.reject,
  };
  const localDecisionCount = localReviewCounts.training + localReviewCounts.eval + localReviewCounts.reject;
  const decisionCount = reviewCounts.training + reviewCounts.eval + reviewCounts.reject;
  const undecidedCount = Math.max(0, pendingReviewCount - localDecisionCount);
  const afterReviewBusy = afterReviewAction !== null;
  const vaultMissing = data?.storage?.configuredMissing === true;
  const startDisabled = targetStrains.length === 0 || readyPhotoSourceCount === 0 || vaultMissing || running || starting;
  const startDisabledReason =
    targetStrains.length === 0
      ? "Add at least one target strain before scraping."
      : readyPhotoSourceCount === 0
        ? "No photo sources are ready."
        : vaultMissing
          ? "TheVault storage folder is missing."
          : running
            ? "Scraper is already running."
            : null;
  const approvedPreferenceLines = data?.reviewPreferences?.summaries?.approvedPatterns ?? [];
  const rejectedPreferenceLines = data?.reviewPreferences?.summaries?.rejectedPatterns ?? [];
  const trustedSourceLines = data?.reviewPreferences?.summaries?.trustedSources ?? [];
  const rejectedReasonLines = data?.reviewPreferences?.summaries?.rejectedReasons ?? [];

  async function saveTargets() {
    if (!data) return;
    setSavingTargets(true);
    setMessage(null);
    try {
      const response = await fetch("/api/data-engine/scrape/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data.scrapeTargets,
          selectedStrains: targetStrains,
          clusters: {
            ...data.scrapeTargets.clusters,
            "purple-lookalike": {
              enabled: true,
              strains: targetStrains,
            },
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save targets.");
      setMessage({ tone: "success", text: "Targets saved." });
      await loadControl();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Could not save targets." });
    } finally {
      setSavingTargets(false);
    }
  }

  async function toggleSource(source: SourceRow, enabled: boolean) {
    setSourceSavingId(source.id);
    setMessage(null);
    try {
      const response = await fetch("/api/data-engine/scrape/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, enabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not update source.");
      setMessage({ tone: "success", text: `${source.name ?? source.id} ${enabled ? "enabled" : "disabled"}.` });
      await loadControl();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "This source is missing setup info." });
    } finally {
      setSourceSavingId(null);
    }
  }

  async function startScraping() {
    setStarting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/data-engine/scrape/start", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not start scraping.");
      setMessage({ tone: "success", text: "Scraping started. Progress will update below." });
      await loadControl();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Could not start scraping." });
    } finally {
      setStarting(false);
    }
  }

  async function stopScraping() {
    setStopping(true);
    setMessage(null);
    try {
      const response = await fetch("/api/data-engine/scrape/stop", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not stop scraping.");
      setMessage({ tone: "info", text: "Stop requested. The scraper will stop between pages or images." });
      await loadControl();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Could not stop scraping." });
    } finally {
      setStopping(false);
    }
  }

  function openReviewQueue(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    window.requestAnimationFrame(() => {
      reviewQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      reviewHeadingRef.current?.focus({ preventScroll: true });
    });
  }

  async function saveReviewDecision(
    event: MouseEvent<HTMLButtonElement>,
    candidate: ReviewCandidate,
    decision: "training" | "eval" | "reject"
  ) {
    event.preventDefault();
    event.stopPropagation();
    const key = candidate.fileName || candidate.id || "";
    if (!key) return;
    setReviewSavingId(key);
    setReviewDecisions((current) => ({ ...current, [key]: decision }));
    try {
      const response = await fetch("/api/data-engine/scrape/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: candidate.fileName, decision }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save review choice.");
      setAfterReviewStep("reviewing");
      setMessage({ tone: "success", text: "Review choice saved." });
    } catch (error) {
      setReviewDecisions((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Could not save review choice." });
    } finally {
      setReviewSavingId(null);
    }
  }

  async function runAfterReviewAction(action: "review" | "learn" | "build" | "audit") {
    const routes = {
      review: "/api/data-engine/run/review",
      learn: "/api/data-engine/run/learn",
      build: "/api/data-engine/run/build-embeddings",
      audit: "/api/data-engine/run/audit",
    };
    const successMessages = {
      review: "Choices saved. Approved and rejected photos were moved.",
      learn: "Photo taste learned. Future scrapes will show those patterns first.",
      build: "Scanner brain updated.",
      audit: "Scanner progress checked.",
    };
    setAfterReviewAction(action);
    setMessage(null);
    try {
      const response = await fetch(routes[action], { method: "POST" });
      const payload = await response.json();
      if (!response.ok || payload?.status === "error") {
        throw new Error(payload?.error ?? `Could not run ${action}.`);
      }
      setMessage({ tone: "success", text: successMessages[action] });
      if (action === "review") setAfterReviewStep("choices-saved");
      if (action === "learn") setAfterReviewStep("learned");
      if (action === "build") setAfterReviewStep("brain-updated");
      if (action === "audit") setAfterReviewStep("progress-checked");
      await loadControl();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : `Could not run ${action}.` });
    } finally {
      setAfterReviewAction(null);
    }
  }

  return (
    <main style={{ display: "grid", gap: 18 }}>
      <SSSectionHeader
        eyebrow="Local scraper"
        title="Scanner Scraper"
        description="Find strain photos, auto-sort strong matches, and keep uncertain photos optional."
      />

      {message && (
        <SSNotice tone={message.tone} title={message.tone === "danger" ? "Needs attention" : "Status"}>
          {message.text}
        </SSNotice>
      )}

      {loading ? (
        <SSCard padding={18}>Loading scraper…</SSCard>
      ) : !data ? (
        <SSNotice tone="danger" title="Could not load scraper">
          Refresh the page or restart the local dev server.
        </SSNotice>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <SSStatCard label="Targets" value={targetStrains.length} />
            <SSStatCard label="Ready photo sources" value={readyPhotoSourceCount} />
            <SSStatCard label="Downloaded" value={data.scrapeStatus.downloadedImages} />
            <SSStatCard label="Optional review" value={data.recentResults.candidateImagesWaitingForReview} />
          </section>

          <SSNotice tone={data.storage?.configuredMissing ? "danger" : data.storage?.isExternal ? "success" : "warning"} title={`Storage: ${data.storage?.label ?? "Project folder"}`}>
            {data.storage?.configuredMissing
              ? "TheVault storage folder was not found."
              : data.storage?.message ?? "Images and scrape results are being saved in the project data folder."}
            {data.storage?.inboxPath ? (
              <div style={{ marginTop: 8 }}>
                Inbox folder: <code>{data.storage.inboxPath}</code>
              </div>
            ) : null}
          </SSNotice>

          <SSCard style={{ padding: 18 }}>
            <SSSectionHeader
              eyebrow="1"
              title="Target Strains"
              description="Start with the strains the scanner gets wrong."
              style={{ marginBottom: 12 }}
            />
            <textarea
              aria-label="Target strain slugs"
              value={targetText}
              onChange={(event) => setTargetText(event.currentTarget.value)}
              rows={7}
              spellCheck={false}
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.32)",
                color: "#fff",
                padding: 14,
                font: "inherit",
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              <SSButton type="button" variant="success" disabled={savingTargets} onClick={() => void saveTargets()}>
                {savingTargets ? "Saving…" : "Save targets"}
              </SSButton>
              <span style={{ color: "#d7f5df", fontSize: 13 }}>One strain slug per line.</span>
            </div>
          </SSCard>

          <SSCard style={{ padding: 18 }}>
            <SSSectionHeader
              eyebrow="2"
              title="Sources"
              description="Only turn on sources you have permission to use."
              style={{ marginBottom: 12 }}
            />
            {readyPhotoSourceCount === 0 && (
              <SSNotice tone="warning" title="No photo sources are turned on yet">
                Add or enable a source before scraping.
              </SSNotice>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {data.sources.map((source) => (
                <SSCard key={source.id} padding={14} style={{ boxShadow: "none" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{source.name ?? source.id}</strong>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <SSBadge tone={source.enabled ? "success" : "warning"}>
                          Enabled: {source.enabled ? "yes" : "no"}
                        </SSBadge>
                        <SSBadge tone="info">{sourceTypeLabel(source.sourceType)}</SSBadge>
                        {source.type ? <SSBadge tone="info">{source.type}</SSBadge> : null}
                        <SSBadge tone={source.status === "Ready" ? "success" : source.status === "Disabled" ? "warning" : "danger"}>
                          {source.status}
                        </SSBadge>
                      </div>
                      <p style={{ margin: "8px 0 0", color: "#d7f5df", fontSize: 13 }}>
                        {source.licenseNotes || "No license or permission note yet."}
                      </p>
                      {source.issues.length > 0 && (
                        <p style={{ margin: "8px 0 0", color: "#ffd28a", fontSize: 13 }}>
                          This source is missing setup info.
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <SSButton
                        type="button"
                        variant="success"
                        disabled={sourceSavingId === source.id || source.enabled}
                        onClick={() => void toggleSource(source, true)}
                      >
                        Enable
                      </SSButton>
                      <SSButton
                        type="button"
                        variant="secondary"
                        disabled={sourceSavingId === source.id || !source.enabled}
                        onClick={() => void toggleSource(source, false)}
                      >
                        Disable
                      </SSButton>
                    </div>
                  </div>
                </SSCard>
              ))}
            </div>
          </SSCard>

          <SSCard tone="success" style={{ padding: 18 }}>
            <SSSectionHeader
              eyebrow="3"
              title="Start / Stop"
              description={autoSortOn ? "Auto-sort is on. Strict candidates can go straight into training or test folders." : "Manual review is on. Nothing trains automatically."}
              style={{ marginBottom: 12 }}
            />
            {autoSortOn ? (
              <SSNotice tone="success" title="Auto-sort is on">
                Strong photos can be added to scanner training, test photos, or junk folders automatically. Unsure photos stay optional.
              </SSNotice>
            ) : null}
            {startDisabledReason && <SSNotice tone="warning">{startDisabledReason}</SSNotice>}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <SSButton
                type="button"
                variant="success"
                disabled={startDisabled}
                onClick={() => void startScraping()}
                style={{ fontSize: 18, padding: "16px 22px" }}
              >
                {starting ? "Starting…" : autoSortOn ? "Run auto-sort scrape" : "Start scraping photos"}
              </SSButton>
              <SSButton
                type="button"
                variant="danger"
                disabled={!running || stopping}
                onClick={() => void stopScraping()}
                style={{ fontSize: 18, padding: "16px 22px" }}
              >
                {stopping ? "Stopping…" : "Stop scraping"}
              </SSButton>
            </div>
          </SSCard>

          <SSCard style={{ padding: 18 }}>
            <SSSectionHeader eyebrow="4" title="Live Progress" style={{ marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <SSStatCard label="Status" value={running ? "Running" : "Stopped"} style={{ boxShadow: "none" }} />
              <SSStatCard
                label="Review mode"
                value={reviewModeLabel(reviewMode)}
                style={{ boxShadow: "none" }}
              />
              <SSStatCard label="Current source" value={data.scrapeStatus.currentSource ?? "None"} style={{ boxShadow: "none" }} />
              <SSStatCard label="Current strain" value={displaySlug(data.scrapeStatus.currentStrain)} style={{ boxShadow: "none" }} />
              <SSStatCard label="Pages checked" value={data.scrapeStatus.processedPages} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images found" value={data.scrapeStatus.imageUrlsFound ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images downloaded" value={data.scrapeStatus.downloadedImages} style={{ boxShadow: "none" }} />
              <SSStatCard label="Added to scanner training" value={data.scrapeStatus.autoTraining ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Saved as test photos" value={data.scrapeStatus.autoEval ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Unsure / optional review" value={data.scrapeStatus.autoReview ?? data.scrapeStatus.sentToReview ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Set aside as junk" value={(data.scrapeStatus.autoRejected ?? 0) + (data.scrapeStatus.autoSetAside ?? 0)} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images skipped" value={data.scrapeStatus.skippedImages ?? data.scrapeStatus.imagesSkipped ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images rejected" value={data.scrapeStatus.rejectedImages ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Ready sources" value={`${data.scrapeStatus.readySources ?? readyPhotoSourceCount} of ${data.scrapeStatus.totalSources ?? data.sources.length}`} style={{ boxShadow: "none" }} />
            </div>
            <div style={{ marginTop: 12, color: "#d7f5df", display: "grid", gap: 4 }}>
              <span>Started: {formatDateTime(data.scrapeStatus.startedAt)}</span>
              <span>Stopped: {formatDateTime(data.scrapeStatus.stoppedAt)}</span>
              <span>Last error: {data.scrapeStatus.lastError || data.scrapeStatus.errors.at(-1)?.message || "None"}</span>
            </div>
            <div
              style={{
                marginTop: 12,
                maxHeight: 180,
                overflow: "auto",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.34)",
                padding: 12,
                color: "#d7f5df",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {(data.scrapeStatus.recentEvents?.length
                ? data.scrapeStatus.recentEvents.map((event) => event.message)
                : data.scrapeStatus.log?.length
                  ? data.scrapeStatus.log
                  : ["No scraping activity yet."]
              ).map((line, index) => (
                <div key={`${line}-${index}`}>{line}</div>
              ))}
            </div>
          </SSCard>

          <SSCard style={{ padding: 18 }}>
            <SSSectionHeader eyebrow="5" title="Results" style={{ marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <SSStatCard label="Review mode" value={reviewModeLabel(data.recentResults.reviewMode ?? reviewMode)} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images found" value={data.recentResults.imagesFoundThisRun ?? data.scrapeStatus.imageUrlsFound ?? 0} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images downloaded this run" value={data.recentResults.imagesDownloadedThisRun} style={{ boxShadow: "none" }} />
              <SSStatCard label="Added to scanner training" value={autoTrainingCount} style={{ boxShadow: "none" }} />
              <SSStatCard label="Saved as test photos" value={autoEvalCount} style={{ boxShadow: "none" }} />
              <SSStatCard label="Set aside as junk" value={autoRejectedCount + (data.recentResults.imagesAutoSetAsideThisRun ?? data.scrapeStatus.autoSetAside ?? 0)} style={{ boxShadow: "none" }} />
              <SSStatCard label="Unsure / optional review" value={autoReviewCount} style={{ boxShadow: "none" }} />
              <SSStatCard label="Images skipped" value={data.scrapeStatus.skippedImages ?? data.recentResults.imagesSkippedThisRun} style={{ boxShadow: "none" }} />
              <SSStatCard label="Source errors" value={data.recentResults.sourceErrors.length} style={{ boxShadow: "none" }} />
            </div>
            {data.scrapeStatus.lastError?.includes("did not find usable photos") ? (
              <SSNotice tone="warning" style={{ marginTop: 14 }}>
                {(data.scrapeStatus.imageUrlsFound ?? 0) > 0
                  ? "The scraper found images, but filters rejected them."
                  : "The source returned no image URLs."}
              </SSNotice>
            ) : null}
            {Object.keys(data.recentResults.rejectionReasons ?? data.scrapeStatus.rejectionReasons ?? {}).length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <strong>Top rejection reasons</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {Object.entries(data.recentResults.rejectionReasons ?? data.scrapeStatus.rejectionReasons ?? {})
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .slice(0, 6)
                    .map(([reason, count]) => (
                      <SSBadge key={reason} tone="warning">
                        {reason}: {count}
                      </SSBadge>
                    ))}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 14 }}>
              <strong>Top strains collected</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {data.recentResults.topStrainsCollected.length ? (
                  data.recentResults.topStrainsCollected.map((row) => (
                    <SSBadge key={row.slug} tone="info">
                      {displaySlug(row.slug)}: {row.count}
                    </SSBadge>
                  ))
                ) : (
                  <span style={{ color: "#d7f5df" }}>No images collected yet.</span>
                )}
              </div>
            </div>
            {data.recentResults.sourceErrors.length > 0 && (
              <SSNotice tone="warning" title="Source errors" style={{ marginTop: 14 }}>
                {data.recentResults.sourceErrors.map((error, index) => (
                  <div key={`${error.sourceId ?? "source"}-${index}`}>
                    {error.sourceId ?? "source"}: {error.message ?? "Unknown error"}
                  </div>
                ))}
              </SSNotice>
            )}
            {reviewListMissing ? (
              <SSNotice tone="warning" title="Review list did not load" style={{ marginTop: 14 }}>
                Scraped photos were found, but the review list did not load. Refresh the page or check the scraper candidate file.
                <div style={{ marginTop: 8 }}>
                  Image candidates: {data.imageCandidateCounts.total} · Pending review: {pendingReviewCount} · Storage:{" "}
                  {data.storage?.label ?? "Project folder"}
                </div>
              </SSNotice>
            ) : null}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <SSButton type="button" variant="primary" disabled={afterReviewBusy} onClick={() => void runAfterReviewAction("build")}>
                {afterReviewAction === "build" ? "Updating scanner brain..." : "Update scanner brain"}
              </SSButton>
              <SSButton type="button" variant="secondary" disabled={afterReviewBusy} onClick={() => void runAfterReviewAction("learn")}>
                {afterReviewAction === "learn" ? "Learning..." : "Learn from this run"}
              </SSButton>
              {pendingReviewCount > 0 ? (
                <SSButton type="button" variant="secondary" onClick={(event) => openReviewQueue(event)}>
                  Review uncertain photos
                </SSButton>
              ) : null}
            </div>
          </SSCard>

          <SSCard style={{ padding: 18 }}>
            <SSSectionHeader
              eyebrow="Taste"
              title="Learning your photo taste"
              description="Future scrapes will show those first."
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: "grid", gap: 10, color: "#d7f5df" }}>
              {[...approvedPreferenceLines, ...rejectedPreferenceLines, ...trustedSourceLines, ...rejectedReasonLines]
                .slice(0, 8)
                .map((line) => (
                  <div key={line}>{line}</div>
                ))}
              {approvedPreferenceLines.length + rejectedPreferenceLines.length + trustedSourceLines.length + rejectedReasonLines.length === 0 ? (
                <div>Run auto-sort, then learn from this run.</div>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <SSButton
                type="button"
                variant="primary"
                disabled={afterReviewBusy}
                onClick={() => void runAfterReviewAction("learn")}
              >
                {afterReviewAction === "learn" ? "Learning..." : "Learn from this run"}
              </SSButton>
              <SSButton
                type="button"
                variant="success"
                disabled={startDisabled}
                onClick={() => void startScraping()}
              >
                Run auto-sort scrape
              </SSButton>
            </div>
          </SSCard>

          <section
            id="review-queue"
            ref={reviewQueueRef}
            style={{ display: "block" }}
          >
            <SSCard style={{ padding: 18 }}>
              <h2
                ref={reviewHeadingRef}
                tabIndex={-1}
                style={{ margin: 0, fontSize: 22, outline: "none" }}
              >
                Unsure photos for optional review
              </h2>
              <p style={{ margin: "8px 0 0", color: "#d7f5df" }}>
                Auto-sort does not need this step. These are only the unsure photos: {pendingReviewCount} {pendingReviewCount === 1 ? "photo" : "photos"} visible now.
              </p>
              {(lowerPriorityHiddenCount > 0 || setAsideCount > 0 || totalAvailableReviewCount > pendingReviewCount) ? (
                <SSNotice tone="info" style={{ marginTop: 14 }}>
                  Auto-sort is keeping this queue optional: {lowerPriorityHiddenCount} lower-priority pending candidates are hidden and {setAsideCount} junk or weak candidates are set aside.
                </SSNotice>
              ) : null}
              {decisionCount > 0 ? (
                <SSCard tone="success" padding={14} style={{ marginTop: 14, boxShadow: "none", position: "sticky", top: 12, zIndex: 2 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <strong>Done reviewing?</strong>
                      <p style={{ margin: "6px 0 0", color: "#d7f5df", fontSize: 13 }}>
                        Choosing a photo only marks your decision. Click Save my choices when you&apos;re done to actually move the photos.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <SSBadge tone="success">Use to teach scanner: {reviewCounts.training}</SSBadge>
                      <SSBadge tone="info">Test photos: {reviewCounts.eval}</SSBadge>
                      <SSBadge tone="danger">Do not use: {reviewCounts.reject}</SSBadge>
                      <SSBadge tone={undecidedCount > 0 ? "warning" : "success"}>Still undecided: {undecidedCount}</SSBadge>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <SSButton
                        type="button"
                        variant="success"
                        disabled={decisionCount === 0 || afterReviewBusy}
                        onClick={() => void runAfterReviewAction("review")}
                      >
                        {afterReviewAction === "review" ? "Saving choices..." : "Save my choices"}
                      </SSButton>
                      {afterReviewStep !== "reviewing" ? (
                        <SSButton
                          type="button"
                          variant="primary"
                          disabled={afterReviewBusy}
                          onClick={() => void runAfterReviewAction("learn")}
                        >
                          {afterReviewAction === "learn" ? "Learning your taste..." : "Learn from my choices"}
                        </SSButton>
                      ) : null}
                      {afterReviewStep === "learned" ? (
                        <SSButton
                          type="button"
                          variant="success"
                          disabled={startDisabled || afterReviewBusy}
                          onClick={() => void startScraping()}
                        >
                          Scrape more photos
                        </SSButton>
                      ) : null}
                      {afterReviewStep !== "reviewing" ? (
                        <SSButton
                          type="button"
                          variant="primary"
                          disabled={afterReviewBusy}
                          onClick={() => void runAfterReviewAction("build")}
                        >
                          {afterReviewAction === "build" ? "Updating scanner brain..." : "Update scanner brain"}
                        </SSButton>
                      ) : null}
                      {afterReviewStep === "brain-updated" || afterReviewStep === "progress-checked" ? (
                        <SSButton
                          type="button"
                          variant="secondary"
                          disabled={afterReviewBusy}
                          onClick={() => void runAfterReviewAction("audit")}
                        >
                          {afterReviewAction === "audit" ? "Checking scanner progress..." : "Check scanner progress"}
                        </SSButton>
                      ) : null}
                    </div>
                    <p style={{ margin: 0, color: "#9fcbaa", fontSize: 12 }}>
                        Flow: Optional review → Save my choices → Learn from this run → Update scanner brain
                    </p>
                  </div>
                </SSCard>
              ) : null}
              {pendingReviewCount === 0 ? (
                <SSNotice tone="info" title="No photos waiting for review" style={{ marginTop: 14 }}>
                  No uncertain photos waiting for review.
                </SSNotice>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
                  {pendingReviewCandidates.map((candidate) => {
                    const candidateKey = candidate.fileName || candidate.id || "";
                    const selectedDecision = reviewDecisions[candidateKey] ?? candidate.reviewStatus;
                    return (
                    <SSCard key={`${candidate.fileName}-${candidate.fileKey}`} padding={12} style={{ boxShadow: "none" }}>
                      {candidate.imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={candidate.imageSrc}
                          alt={`${displaySlug(candidate.strainSlug)} candidate`}
                          style={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            objectFit: "cover",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(0,0,0,0.25)",
                          }}
                        />
                      ) : null}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                        <SSBadge tone="info">{displaySlug(candidate.strainSlug)}</SSBadge>
                        {typeof candidate.qualityScore === "number" ? (
                          <SSBadge tone={candidate.qualityScore >= 82 ? "success" : "warning"}>
                            Score {candidate.qualityScore}
                          </SSBadge>
                        ) : null}
                        <SSBadge tone={selectedDecision && selectedDecision !== "pending" ? "success" : "warning"}>
                          {selectedDecision && selectedDecision !== "pending"
                            ? selectedDecision === "training"
                              ? "Use this photo"
                              : selectedDecision === "eval"
                                ? "Saved as test photo"
                                : "Do not use"
                            : "Waiting for review"}
                        </SSBadge>
                      </div>
                      <p style={{ margin: "8px 0 0", color: "#d7f5df", fontSize: 12 }}>
                        {candidate.sourceId ?? "unknown source"}
                      </p>
                      {candidate.queryUsed ? (
                        <p style={{ margin: "6px 0 0", color: "#9fcbaa", fontSize: 12 }}>
                          Query: {candidate.queryUsed}
                        </p>
                      ) : null}
                      {(candidate.learnedReasons?.length ?? 0) > 0 ? (
                        <p style={{ margin: "6px 0 0", color: "#9fcbaa", fontSize: 12 }}>
                          Why shown: {candidate.learnedReasons?.slice(0, 2).join(", ")}
                        </p>
                      ) : null}
                      {(candidate.qualityWarnings?.length ?? 0) > 0 ? (
                        <p style={{ margin: "8px 0 0", color: "#ffd28a", fontSize: 12 }}>
                          {candidate.qualityWarnings?.join(", ")}
                        </p>
                      ) : null}
                      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                        <SSButton
                          type="button"
                          variant="success"
                          disabled={reviewSavingId === candidateKey}
                          onClick={(event) => void saveReviewDecision(event, candidate, "training")}
                        >
                          Use this photo
                        </SSButton>
                        <SSButton
                          type="button"
                          variant="secondary"
                          disabled={reviewSavingId === candidateKey}
                          onClick={(event) => void saveReviewDecision(event, candidate, "eval")}
                        >
                          Save as test photo
                        </SSButton>
                        <SSButton
                          type="button"
                          variant="danger"
                          disabled={reviewSavingId === candidateKey}
                          onClick={(event) => void saveReviewDecision(event, candidate, "reject")}
                        >
                          Do not use
                        </SSButton>
                      </div>
                    </SSCard>
                  );
                })}
                </div>
              )}
            </SSCard>
          </section>

          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 900,
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.34)",
              }}
            >
              Developer details
            </summary>
            <pre
              style={{
                margin: "12px 0 0",
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.34)",
                padding: 12,
                color: "#d7f5df",
                fontSize: 12,
              }}
            >
              {JSON.stringify(
                {
                  targets: data.scrapeTargets,
                  status: data.scrapeStatus,
                  recentRuns: data.recentScrapeRuns,
                  imageCounts: data.imageCandidateCounts,
                },
                null,
                2
              )}
            </pre>
          </details>
        </>
      )}
    </main>
  );
}