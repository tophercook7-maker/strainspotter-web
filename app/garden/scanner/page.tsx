"use client";

import { apiUrl } from "@/lib/config/apiBase";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  orchestrateScan,
  type HybridScanPresentation,
  type ScanPayloadUiFlags,
} from "@/lib/scanner/scanOrchestrator";
import {
  HybridScanLeadSections,
  HybridScanDetailSections,
  matchConfidenceTier,
} from "./HybridScanResultSections";
import Link from "next/link";
import AuthScreen from "@/components/AuthScreen";
import type { ScanEntitlements } from "@/lib/scanner/scanEntitlements";
import {
  getScansRemaining,
  bumpAnonymousScanUsage,
  fetchScanEntitlements,
  FREE_SCAN_TOTAL,
  canScanAnonymousLocal,
} from "@/lib/scanGating";
import { persistUnifiedScan } from "@/lib/growlog/persistUnifiedScan";
import { buildUnifiedScanUiForPersist } from "@/lib/scanner/savedScanMappers";
import { savedScanResultsPath } from "@/lib/scanner/savedScanNav";

/* ─── try to use real auth, fall back gracefully ─── */
let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

function getLocalTier(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("ss_membership_tier"); } catch { return null; }
}
function tierLabel(t: string) { return t === "pro" ? "Pro" : t === "member" ? "Member" : "Free"; }
function tierColor(t: string) { return t === "pro" ? "#FFD700" : t === "member" ? "#4CAF50" : "rgba(255,255,255,0.35)"; }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   StrainSpotter Scanner — Clean Visual Redesign
   Premium mobile-first cannabis scanner UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type ScanState = "idle" | "ready" | "scanning" | "done";

/* ─── Similar Strains ─────────────────────────────────────────────────────── */
const TYPE_PILL: Record<string, { bg: string; color: string }> = {
  Sativa:  { bg: "rgba(255,213,79,0.15)",  color: "#FFD54F" },
  Indica:  { bg: "rgba(149,117,205,0.15)", color: "#9575CD" },
  Hybrid:  { bg: "rgba(102,187,106,0.15)", color: "#66BB6A" },
};

interface SimilarStrain {
  id: string; name: string; type: string;
  effects: string[]; flavors: string[];
  thc: number | null; popularity: number;
}

function SimilarStrains({ result }: { result: SimpleResult }) {
  const [strains, setStrains] = useState<SimilarStrain[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!result.effects.length && !result.terpenes.length) { setLoading(false); return; }
    const params = new URLSearchParams({
      strain_name: result.strainName,
      effects: result.effects.slice(0, 3).join(","),
      terpenes: result.terpenes.slice(0, 2).join(","),
      type: result.type,
    });
    fetch(apiUrl(`/api/similar-strains?${params}`))
      .then((r) => r.json())
      .then((d) => setStrains(d.similar || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [result.strainName]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "16px 0", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
      Finding similar strains…
    </div>
  );
  if (!strains.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
        You Might Also Like
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
        {strains.map((s) => {
          const pill = TYPE_PILL[s.type] || TYPE_PILL.Hybrid;
          return (
            <div
              key={s.id}
              onClick={() => router.push(`/garden/strains?q=${encodeURIComponent(s.name)}`)}
              style={{
                flexShrink: 0, width: 160,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderTop: `3px solid ${pill.color}`,
                borderRadius: 14, padding: "12px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", lineHeight: 1.3, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.name}
              </div>
              <div style={{
                display: "inline-block", padding: "2px 8px", borderRadius: 6,
                fontSize: 10, fontWeight: 700, background: pill.bg, color: pill.color,
                marginBottom: 8,
              }}>
                {s.type}
              </div>
              {s.thc != null && s.thc > 0 && (
                <div style={{ fontSize: 11, color: "#66BB6A", fontWeight: 700, marginBottom: 6 }}>
                  THC {s.thc}%
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {s.effects.slice(0, 3).map((e) => (
                  <span key={e} style={{
                    padding: "2px 6px", borderRadius: 5, fontSize: 10,
                    background: "rgba(102,187,106,0.1)", color: "#81C784",
                    border: "1px solid rgba(102,187,106,0.15)",
                  }}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`.similar-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/* ─── PWA Install Banner ──────────────────────────────────────────────────── */
function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Already dismissed this session
    if (sessionStorage.getItem("pwa_banner_dismissed")) return;

    // Android Chrome: catch beforeinstallprompt
    const handler = (e: any) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari: detect and show tip
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) setShowIOSTip(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa_banner_dismissed", "1");
  };

  if (dismissed || (!prompt && !showIOSTip)) return null;

  return (
    <div style={{
      margin: "0 0 12px",
      background: "linear-gradient(135deg, rgba(76,175,80,0.12), rgba(56,142,60,0.06))",
      border: "1px solid rgba(76,175,80,0.25)",
      borderRadius: 14, padding: "12px 14px",
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#81C784", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
          Install StrainSpotter
        </div>
        {showIOSTip ? (
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.5 }}>
            Tap <strong style={{ color: "rgba(255,255,255,0.8)" }}>Share</strong> then{" "}
            <strong style={{ color: "rgba(255,255,255,0.8)" }}>Add to Home Screen</strong> for the full app experience.
          </div>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.5 }}>
            Add to your home screen for instant access and a native app feel.
          </div>
        )}
        {prompt && (
          <button
            onClick={install}
            style={{
              marginTop: 8, padding: "5px 14px", borderRadius: 8,
              background: "rgba(76,175,80,0.3)", border: "1px solid rgba(76,175,80,0.5)",
              color: "#81C784", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Install
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.3)",
          fontSize: 18, cursor: "pointer", padding: 0, flexShrink: 0, lineHeight: 1,
        }}
      >✕</button>
    </div>
  );
}

interface SimpleResult {
  strainName: string;
  confidence: number;
  confidenceLabel: string;
  type: "Indica" | "Sativa" | "Hybrid" | "Unknown";
  lineage: string;
  effects: string[];
  terpenes: string[];
  description: string;
  tips: string[];
  alternates: Array<{ name: string; confidence: number }>;
  // Medical info
  medicalConditions: string[];
  sideEffects: string[];
  intensity: string;
  timeOfDay: string;
  cbdContext: string;
  cautions: string;
  // Chemistry + genetics
  thc: string;
  cbd: string;
  indicaPct: number;
  sativaPct: number;
  // Visual analysis
  visualTraits: string[];
  budStructure: string;
  trichomes: string;
  coloration: string;
  // Extra context
  bestUse: string[];
  duration: string;
  breederNotes: string;
  // Grower data
  growDifficulty: string;
  floweringTime: string;
  vegetativeTime: string;
  yieldIndoor: string;
  yieldOutdoor: string;
  plantHeight: string;
  trainingMethods: string[];
  nutrientNeeds: string;
  climate: string;
  moldResistance: string;
  pestResistance: string;
  harvestIndicators: string;
  cureTime: string;
  growNotes: string;
  // Breeder data
  originStory: string;
  parentStrains: string[];
  grandparentStrains: string[];
  breedingNotes: string;
  phenotypeVariation: string;
  geneticStability: string;
  seedTypes: string;
  terpeneInheritance: string;
  breedingPotential: string;
  // Dispensary data
  salesDescription: string;
  targetCustomer: string;
  bestProductForms: string[];
  activityPairing: string[];
  experienceLevel: string;
  flavorNotes: string;
  aromaProfile: string;
  pricingTier: string;
  marketingTags: string[];
  menuDescription: string;
  consultingScript: string;
  // Engagement / hook fields
  tagline: string;
  vibeScore: { energizing: number; creative: number; social: number; relaxing: number } | null;
  expertTip: string;
}

function mapConfidence(n: number): string {
  if (n >= 85) return "Strong Match";
  if (n >= 70) return "Good Match";
  if (n >= 55) return "Possible Match";
  return "Low Match";
}

/** Aligns with hybrid fusion + flags — softer hero when match is weak or ambiguous. */
function isWeakScanResult(
  flags: ScanPayloadUiFlags | null | undefined,
  hybrid: HybridScanPresentation | null | undefined,
  confidence: number
): boolean {
  if (flags?.resultType === "unresolved") return true;
  if (flags?.status === "needs_better_images") return true;
  const top = hybrid?.matches?.[0]?.confidence;
  if (typeof top === "number" && top < 42) return true;
  if (matchConfidenceTier(confidence) === "Low confidence") return true;
  return false;
}

async function filesToDataUrls(files: File[]): Promise<string[]> {
  return Promise.all(
    files.map(
      (f) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error("read"));
          r.readAsDataURL(f);
        })
    )
  );
}

function typeGradient(type: string): string {
  if (type === "Indica") return "linear-gradient(135deg, #7B1FA2, #4A148C)";
  if (type === "Sativa") return "linear-gradient(135deg, #F57C00, #E65100)";
  return "linear-gradient(135deg, #2E7D32, #1B5E20)";
}

function typeEmoji(type: string): string {
  if (type === "Indica") return "🌙";
  if (type === "Sativa") return "☀️";
  return "🌿";
}

function activityEmoji(activity: string): string {
  const a = activity.toLowerCase();
  if (a.includes("movie") || a.includes("film") || a.includes("watch") || a.includes("stream")) return "🎬";
  if (a.includes("creat") || a.includes("art") || a.includes("paint") || a.includes("draw") || a.includes("design")) return "🎨";
  if (a.includes("hik") || a.includes("outdoor") || a.includes("nature") || a.includes("trail") || a.includes("camp")) return "🥾";
  if (a.includes("yoga") || a.includes("meditat") || a.includes("mindful") || a.includes("breath")) return "🧘";
  if (a.includes("social") || a.includes("party") || a.includes("friend") || a.includes("gather") || a.includes("crowd")) return "👥";
  if (a.includes("music") || a.includes("concert") || a.includes("listen") || a.includes("playlist") || a.includes("festival")) return "🎵";
  if (a.includes("gaming") || a.includes("game") || a.includes("video game")) return "🎮";
  if (a.includes("food") || a.includes("cook") || a.includes("eat") || a.includes("munch") || a.includes("snack") || a.includes("bake")) return "🍕";
  if (a.includes("sleep") || a.includes("rest") || a.includes("bed") || a.includes("nap")) return "😴";
  if (a.includes("workout") || a.includes("gym") || a.includes("exercise") || a.includes("run") || a.includes("sport")) return "💪";
  if (a.includes("beach") || a.includes("pool") || a.includes("swim") || a.includes("lake")) return "🏖️";
  if (a.includes("read") || a.includes("book")) return "📚";
  if (a.includes("relax") || a.includes("chill") || a.includes("couch") || a.includes("lazy") || a.includes("lounge")) return "🛋️";
  if (a.includes("focus") || a.includes("work") || a.includes("productiv") || a.includes("study")) return "💡";
  if (a.includes("laugh") || a.includes("comedy") || a.includes("giggle")) return "😂";
  if (a.includes("sex") || a.includes("intima") || a.includes("romance")) return "💋";
  if (a.includes("walk") || a.includes("stroll") || a.includes("bike")) return "🚶";
  return "✨";
}

function formatScanAllowanceHint(e: ScanEntitlements): string {
  if (e.isUnlimited) return "Unlimited";
  if (e.tier === "free") {
    const parts: string[] = [];
    parts.push(`${e.freeScansRemaining} free left (3 total)`);
    if (e.topupScansAvailable > 0) {
      parts.push(`${e.topupScansAvailable} top-up`);
    }
    return parts.join(" · ");
  }
  if (e.tier === "member") {
    const parts: string[] = [];
    parts.push(`${e.memberScansRemaining}/75 this period`);
    if (e.topupScansAvailable > 0) {
      parts.push(`${e.topupScansAvailable} top-up`);
    }
    return parts.join(" · ");
  }
  return "";
}

export default function ScannerPage() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<SimpleResult | null>(null);
  const [hybridPresentation, setHybridPresentation] = useState<HybridScanPresentation | null>(null);
  const [scanPayloadFlags, setScanPayloadFlags] = useState<ScanPayloadUiFlags | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [photoContributed, setPhotoContributed] = useState<"verified" | "saved" | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "medical" | "grower" | "breeder" | "dispensary">("overview");
  const [creditEarned, setCreditEarned] = useState(false);
  const [serverEntitlements, setServerEntitlements] =
    useState<ScanEntitlements | null>(null);
  const [anonRemaining, setAnonRemaining] = useState(0);
  const [apiScanSummary, setApiScanSummary] = useState<string | null>(null);
  const [saveHistoryState, setSaveHistoryState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savedScanLinkId, setSavedScanLinkId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraFileRef = useRef<HTMLInputElement>(null);
  /** Tracks blob: URLs from `URL.createObjectURL` for matching `revokeObjectURL` calls. */
  const previewObjectUrlsRef = useRef<string[]>([]);

  const revokeAllPreviewUrls = useCallback(() => {
    previewObjectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    previewObjectUrlsRef.current = [];
  }, []);

  const setPreviewUrlsForFiles = useCallback((files: File[]) => {
    revokeAllPreviewUrls();
    const urls = files.map((f) => URL.createObjectURL(f));
    previewObjectUrlsRef.current = urls;
    setPreviews(urls);
  }, [revokeAllPreviewUrls]);

  useEffect(() => {
    setAnonRemaining(getScansRemaining());
  }, []);

  useEffect(
    () => () => {
      revokeAllPreviewUrls();
    },
    [revokeAllPreviewUrls]
  );

  /** Return save button to idle after a beat so users can save another copy (new row). */
  useEffect(() => {
    if (saveHistoryState !== "saved") return;
    const t = setTimeout(() => setSaveHistoryState("idle"), 3200);
    return () => clearTimeout(t);
  }, [saveHistoryState]);

  const saveFavorite = () => {
    if (!result) return;
    const STORAGE_KEY = "strainspotter_favorites";
    let favs: any[] = [];
    try { favs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { favs = []; }
    const entry = {
      id: `fav-${Date.now()}`,
      strainName: result.strainName,
      confidence: result.confidence,
      savedAt: new Date().toISOString(),
    };
    favs.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    setIsFavorited(true);
  };

  const MAX_IMAGES = 5;

  const auth = useOptionalAuth();
  const isLoggedIn = !!auth?.user;
  const displayName = auth?.profile?.display_name || auth?.user?.email?.split("@")[0] || null;
  const tier = (auth?.profile != null ? auth.tier : (getLocalTier() || auth?.tier || "free")) as "free" | "member" | "pro";

  useEffect(() => {
    const token = auth?.session?.access_token;
    if (!token) {
      setServerEntitlements(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await fetchScanEntitlements(token);
      if (!cancelled && r.ok) setServerEntitlements(r.entitlements);
      if (!cancelled && !r.ok) setServerEntitlements(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth?.session?.access_token]);

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArr.length === 0) return;

    setImages((prev) => {
      const next = [...prev, ...fileArr].slice(0, MAX_IMAGES);
      setPreviewUrlsForFiles(next);
      return next;
    });
    setResult(null);
    setHybridPresentation(null);
    setScanPayloadFlags(null);
    setApiScanSummary(null);
    setSaveHistoryState("idle");
    setSavedScanLinkId(null);
    setError(null);
    setScanState("ready");
  }, [setPreviewUrlsForFiles]);

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setPreviewUrlsForFiles(next);
      if (next.length === 0) setScanState("idle");
      return next;
    });
    setResult(null);
    setHybridPresentation(null);
    setScanPayloadFlags(null);
    setApiScanSummary(null);
    setSaveHistoryState("idle");
    setSavedScanLinkId(null);
  };

  const clearAll = () => {
    revokeAllPreviewUrls();
    setImages([]);
    setPreviews([]);
    setResult(null);
    setHybridPresentation(null);
    setScanPayloadFlags(null);
    setApiScanSummary(null);
    setSaveHistoryState("idle");
    setSavedScanLinkId(null);
    setError(null);
    setScanState("idle");
    setIsFavorited(false);
    setPhotoContributed(null);
  };

  const handleScan = async () => {
    if (images.length === 0 || scanState === "scanning") return;

    if (isLoggedIn && auth?.session?.access_token) {
      if (!serverEntitlements) {
        setError("Loading scan allowance…");
        return;
      }
      if (!serverEntitlements.canScan) {
        setError(
          "No scans remaining. Member plans include 75 scans per billing period; add a top-up pack for more."
        );
        return;
      }
    } else {
      if (!canScanAnonymousLocal()) {
        setError(
          `You've used all ${FREE_SCAN_TOTAL} free scans. Sign in to sync your plan, or become a member for more.`
        );
        return;
      }
    }

    setScanState("scanning");
    setError(null);
    setHybridPresentation(null);
    setScanPayloadFlags(null);
    setApiScanSummary(null);
    setSaveHistoryState("idle");
    setSavedScanLinkId(null);

    try {
      const authToken = auth?.session?.access_token || undefined;
      const orchestrated = await orchestrateScan(images, authToken);

      if (orchestrated.displayName === "Analysis Failed") {
        const msg =
          orchestrated.summary?.[0] ||
          "We couldn’t complete this scan. Check your connection or try again.";
        setError(msg);
        setScanState("ready");
        return;
      }

      setHybridPresentation(orchestrated.hybridPresentation ?? null);
      setScanPayloadFlags(orchestrated.scanPayloadFlags ?? null);
      setApiScanSummary(orchestrated.apiScanSummary ?? null);
      const vm = orchestrated.rawScannerResult;

      const vm_chem = (vm as any).chemistry || {};
      const vm_exp = (vm as any).experience || {};
      const vm_ratio = (vm as any).ratio || {};
      const vm_medical = (vm as any).medicalRaw || {};
      const vm_grower = (vm as any).growerRaw || {};
      const vm_breeder = (vm as any).breederRaw || {};
      const vm_dispensary = (vm as any).dispensaryRaw || {};
      const cannabinoids = vm_chem.cannabinoids || {};
      const thcVal = cannabinoids.THC || vm_chem.cannabinoidRange || "";
      const cbdVal = cannabinoids.CBD || "";
      const indicaPct = typeof vm_ratio.indica === "number" ? vm_ratio.indica : 50;
      const sativaPct = typeof vm_ratio.sativa === "number" ? vm_ratio.sativa : 50;
      const allEffects = [...(vm.effectsLong || []), ...(vm.effectsShort || [])].filter(Boolean);
      const uniqueEffects = Array.from(new Set(allEffects)).slice(0, 8);

      const simple: SimpleResult = {
        strainName: vm.nameFirstDisplay?.primaryStrainName || vm.name || "Unknown",
        confidence: vm.confidence || 0,
        confidenceLabel: mapConfidence(vm.confidence || 0),
        type: (vm.genetics?.dominance as any) || "Hybrid",
        lineage: vm.genetics?.lineage || "",
        effects: uniqueEffects,
        terpenes: (vm.terpeneGuess || []).slice(0, 6),
        description: vm.visualMatchSummary || vm.aiWikiBlend || "",
        tips: (vm.accuracyTips || []).slice(0, 3),
        alternates: (vm.nameFirstDisplay as any)?.alternateMatches?.slice(0, 3).map((a: any) => ({
          name: a.name || a.strainName,
          confidence: a.confidence || 0,
        })) || [],
        // Medical fields
        medicalConditions: Array.isArray(vm_medical.conditions) ? vm_medical.conditions.slice(0, 6) : [],
        sideEffects: Array.isArray(vm_medical.sideEffects) ? vm_medical.sideEffects.slice(0, 4) : [],
        intensity: vm_medical.intensity || "",
        timeOfDay: vm_medical.timeOfDay || "",
        cbdContext: vm_medical.cbdContext || "",
        cautions: vm_medical.cautions || "",
        // Chemistry + genetics
        thc: thcVal,
        cbd: cbdVal,
        indicaPct,
        sativaPct,
        // Visual analysis
        visualTraits: Array.isArray(vm.growthTraits) ? vm.growthTraits.slice(0, 6) : [],
        budStructure: vm.flowerStructureAnalysis || "",
        trichomes: vm.trichomeDensityMaturity || "",
        coloration: vm.colorPistilIndicators || "",
        // Extra context
        bestUse: Array.isArray(vm_exp.bestUse) ? vm_exp.bestUse.slice(0, 4) : [],
        duration: vm_exp.duration || "",
        breederNotes: (vm.genetics as any)?.breederNotes || "",
        // Grower data
        growDifficulty: vm_grower.difficulty || "",
        floweringTime: vm_grower.floweringTime || "",
        vegetativeTime: vm_grower.vegetativeTime || "",
        yieldIndoor: vm_grower.yieldIndoor || "",
        yieldOutdoor: vm_grower.yieldOutdoor || "",
        plantHeight: vm_grower.plantHeight || "",
        trainingMethods: Array.isArray(vm_grower.trainingMethods) ? vm_grower.trainingMethods : [],
        nutrientNeeds: vm_grower.nutrientNeeds || "",
        climate: vm_grower.climate || "",
        moldResistance: vm_grower.moldResistance || "",
        pestResistance: vm_grower.pestResistance || "",
        harvestIndicators: vm_grower.harvestIndicators || "",
        cureTime: vm_grower.cureTime || "",
        growNotes: vm_grower.growNotes || "",
        // Breeder data
        originStory: vm_breeder.originStory || "",
        parentStrains: Array.isArray(vm_breeder.parentStrains) ? vm_breeder.parentStrains : [],
        grandparentStrains: Array.isArray(vm_breeder.grandparentStrains) ? vm_breeder.grandparentStrains : [],
        breedingNotes: vm_breeder.breedingNotes || "",
        phenotypeVariation: vm_breeder.phenotypeVariation || "",
        geneticStability: vm_breeder.geneticStability || "",
        seedTypes: vm_breeder.seedTypes || "",
        terpeneInheritance: vm_breeder.terpeneInheritance || "",
        breedingPotential: vm_breeder.breedingPotential || "",
        // Dispensary data
        salesDescription: vm_dispensary.salesDescription || "",
        targetCustomer: vm_dispensary.targetCustomer || "",
        bestProductForms: Array.isArray(vm_dispensary.bestProductForms) ? vm_dispensary.bestProductForms : [],
        activityPairing: Array.isArray(vm_dispensary.activityPairing) ? vm_dispensary.activityPairing : [],
        experienceLevel: vm_dispensary.experienceLevel || "",
        flavorNotes: vm_dispensary.flavorNotes || "",
        aromaProfile: vm_dispensary.aromaProfile || "",
        pricingTier: vm_dispensary.pricingTier || "",
        marketingTags: Array.isArray(vm_dispensary.marketingTags) ? vm_dispensary.marketingTags : [],
        menuDescription: vm_dispensary.menuDescription || "",
        consultingScript: vm_dispensary.consultingScript || "",
        // Engagement fields
        tagline: (vm as any).engagementRaw?.tagline || "",
        vibeScore: (vm as any).engagementRaw?.vibeScore
          ? {
              energizing: Number((vm as any).engagementRaw.vibeScore.energizing) || 5,
              creative: Number((vm as any).engagementRaw.vibeScore.creative) || 5,
              social: Number((vm as any).engagementRaw.vibeScore.social) || 5,
              relaxing: Number((vm as any).engagementRaw.vibeScore.relaxing) || 5,
            }
          : null,
        expertTip: (vm as any).engagementRaw?.expertTip || "",
      };

      setResult(simple);
      setScanState("done");

      if (isLoggedIn && auth?.session?.access_token) {
        const ent = await fetchScanEntitlements(auth.session.access_token);
        if (ent.ok) {
          setServerEntitlements(ent.entitlements);
        }
      } else {
        bumpAnonymousScanUsage();
        setAnonRemaining(getScansRemaining());
      }

      // Non-blocking: upload scan photo to community DB if confidence is high enough and user is logged in
      if (simple.confidence >= 65 && authToken && images.length > 0) {
        // Read the File as a data URL (images[] holds File objects, not strings)
        const firstFile = images[0];
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          fetch(apiUrl("/api/strain-photos"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({
              strain_name: simple.strainName,
              confidence: simple.confidence,
              image_data_url: dataUrl,
            }),
          }).then((r) => r.json()).then((d) => {
            if (d.ok) {
              const level = simple.confidence >= 80 ? "verified" : "saved";
              setPhotoContributed(level);
              if (level === "verified") {
                const alreadyConsented = localStorage.getItem(`ss_consented_${simple.strainName}`);
                if (!alreadyConsented) {
                  setTimeout(() => setShowConsentModal(true), 1400);
                }
              }
            }
          }).catch(() => {});
        };
        reader.onerror = () => {}; // non-critical, skip silently
        reader.readAsDataURL(firstFile);
      }
    } catch (e: any) {
      console.error("Scan error:", e);
      setError("Couldn't analyze the image. Try a clearer photo with better lighting.");
      setScanState("ready");
    }
  };

  const weakResult =
    result && scanState === "done"
      ? isWeakScanResult(scanPayloadFlags, hybridPresentation, result.confidence)
      : false;

  const handleSaveToHistory = async () => {
    if (!result || scanState !== "done") return;
    if (saveHistoryState === "saving") return;
    setSaveHistoryState("saving");
    try {
      const ui = buildUnifiedScanUiForPersist({
        imageCount: images.length,
        hybridMatches: hybridPresentation?.matches,
        plantAnalysis: hybridPresentation?.plantAnalysis ?? null,
        growCoach: hybridPresentation?.growCoach ?? null,
        improveTips: hybridPresentation?.improveTips,
        poorImageMessage: hybridPresentation?.poorImageMessage,
        apiScanSummary,
        topConfidence: result.confidence,
        status: scanPayloadFlags?.status,
        resultType: scanPayloadFlags?.resultType,
      });
      const imageDataUrls = images.length > 0 ? await filesToDataUrls(images) : undefined;
      const clientSnapshotId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `scan-${Date.now()}`;
      const out = await persistUnifiedScan({
        ui,
        userId: auth?.user?.id ?? null,
        imageDataUrls,
        clientSnapshotId,
        linkedPlantId: null,
        linkedPlantName: null,
        legacyMetadata: {
          apiScanSummary: apiScanSummary ?? undefined,
          primaryStrainName: result.strainName,
        },
      });
      setSavedScanLinkId(out.savedScanId);
      setSaveHistoryState("saved");
    } catch (e) {
      console.error("Save to history failed:", e);
      setSaveHistoryState("error");
    }
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addImages(e.dataTransfer.files);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0f0a 0%, #0d1a0d 40%, #0a0f0a 100%)",
      color: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Top Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,15,10,0.85)",
        backdropFilter: "blur(20px)",
      }}>
        <Link href="/garden" style={{
          color: "rgba(255,255,255,0.5)",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
        }}>
          🌿 Garden
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
          Scanner
        </span>
        {isLoggedIn ? (
          <button
            onClick={() => router.push("/garden/settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {isLoggedIn && serverEntitlements && !serverEntitlements.isUnlimited && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                color: "#66BB6A", background: "rgba(102,187,106,0.15)",
                border: "1px solid rgba(102,187,106,0.35)",
                borderRadius: 5, padding: "2px 6px",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }} title={formatScanAllowanceHint(serverEntitlements)}>
                {formatScanAllowanceHint(serverEntitlements)}
              </span>
            )}
            {!isLoggedIn && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 5, padding: "2px 6px",
              }}>
                {anonRemaining} free · {FREE_SCAN_TOTAL} total
              </span>
            )}
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: tierColor(tier),
              background: `${tierColor(tier)}18`,
              border: `1px solid ${tierColor(tier)}44`,
              borderRadius: 5,
              padding: "2px 6px",
            }}>{tierLabel(tier)}</span>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #43A047, #2E7D32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
            }}>
              {(displayName || "?")[0].toUpperCase()}
            </div>
          </button>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            style={{
              background: "linear-gradient(135deg, #43A047, #2E7D32)",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        )}
      </div>

      <div style={{ padding: "0 20px 100px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── PWA Install Banner ── */}
        <div style={{ paddingTop: 16 }}>
          <InstallBanner />
        </div>

        {/* ── UPLOAD AREA ── */}
        {scanState !== "done" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            style={{
              margin: "24px auto 0",
              width: "100%",
              maxWidth: 340,
              aspectRatio: "1",
              borderRadius: "50%",
              background: scanState === "scanning"
                ? "radial-gradient(circle, rgba(46,125,50,0.15) 0%, rgba(10,15,10,0) 70%)"
                : images.length > 0
                ? "radial-gradient(circle, rgba(46,125,50,0.1) 0%, rgba(10,15,10,0) 70%)"
                : "radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(10,15,10,0) 70%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: scanState === "scanning" ? "default" : "pointer",
              position: "relative",
              transition: "all 0.3s ease",
            }}
          >
            {/* Outer ring */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: scanState === "scanning"
                ? "2px solid rgba(76,175,80,0.6)"
                : images.length > 0
                ? "2px solid rgba(76,175,80,0.3)"
                : "2px solid rgba(255,255,255,0.08)",
              animation: scanState === "scanning" ? "scanPulse 2s ease-in-out infinite" : "none",
            }} />

            {/* Inner ring */}
            <div style={{
              position: "absolute",
              inset: 20,
              borderRadius: "50%",
              border: scanState === "scanning"
                ? "1px solid rgba(76,175,80,0.3)"
                : "1px solid rgba(255,255,255,0.04)",
              animation: scanState === "scanning" ? "scanPulse 2s ease-in-out infinite 0.5s" : "none",
            }} />

            {/* Content */}
            {scanState === "scanning" ? (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{
                  animation: "leafSpin 3s ease-in-out infinite",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "center",
                }}>
                  <img src="/brand/cannabis-icon.png" width={64} height={64} alt="" style={{ display: 'inline-block', flexShrink: 0, borderRadius: '50%' }} />
                </div>
                <p style={{ color: "rgba(76,175,80,0.9)", fontSize: 16, fontWeight: 600 }}>
                  Analyzing...
                </p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>
                  AI is identifying your strain
                </p>
              </div>
            ) : images.length > 0 ? (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{
                  fontSize: 48,
                  marginBottom: 12,
                  opacity: 0.9,
                }}>📸</div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>
                  {images.length} photo{images.length > 1 ? "s" : ""} ready
                </p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>
                  Tap to add more (up to {MAX_IMAGES})
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{
                  fontSize: 56,
                  marginBottom: 16,
                  opacity: 0.6,
                }}>🔍</div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 600 }}>
                  Upload Photos
                </p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 6 }}>
                  2–5 photos from different angles work best
                </p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Choose cannabis photos from your library"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={cameraFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          aria-label="Take a cannabis photo with your camera"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }}
        />

        {scanState !== "done" && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraFileRef.current?.click();
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(76,175,80,0.45)",
                background: "rgba(76,175,80,0.12)",
                color: "#A5D6A7",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Use camera
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.65)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Choose photos
            </button>
          </div>
        )}

        {/* ── THUMBNAIL STRIP ── */}
        {images.length > 0 && scanState !== "done" && (
          <div style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginTop: 20,
            flexWrap: "wrap",
          }}>
            {previews.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    objectFit: "cover",
                    opacity: scanState === "scanning" ? 0.5 : 1,
                    transition: "opacity 0.3s",
                  }}
                />
                {scanState !== "scanning" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PRE-SCAN QUALITY HINTS (improves real-world match rate) ── */}
        {scanState === "ready" && images.length > 0 && (
          <div
            style={{
              marginTop: 22,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1.3,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.38)",
                marginBottom: 10,
              }}
            >
              Stronger IDs start here
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              <li>
                Use{" "}
                <strong style={{ color: "rgba(255,255,255,0.88)", fontWeight: 600 }}>
                  bright, even light
                </strong>{" "}
                so color and trichomes are visible (avoid heavy shadow on the bud).
              </li>
              <li>
                Keep the flower{" "}
                <strong style={{ color: "rgba(255,255,255,0.88)", fontWeight: 600 }}>
                  in focus
                </strong>{" "}
                and{" "}
                <strong style={{ color: "rgba(255,255,255,0.88)", fontWeight: 600 }}>
                  filling most of the frame
                </strong>
                .
              </li>
              {images.length < 3 ? (
                <li>
                  <strong style={{ color: "rgba(129,199,132,0.95)", fontWeight: 700 }}>
                    Add {Math.max(1, 3 - images.length)} more photo
                    {3 - images.length > 1 ? "s" : ""}
                  </strong>{" "}
                  when you can—top, side, and a trichome macro give the matcher more signal.
                </li>
              ) : (
                <li>
                  Multiple angles help—include a macro trichome shot if anything looks blurry at arm&apos;s length.
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ── SCAN BUTTON ── */}
        {(scanState === "ready") && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <button
              onClick={handleScan}
              style={{
                background: "linear-gradient(135deg, #43A047, #2E7D32)",
                border: "none",
                borderRadius: 50,
                padding: "16px 48px",
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: 0.5,
                boxShadow: "0 4px 24px rgba(46,125,50,0.4)",
                transition: "all 0.2s",
              }}
            >
              Identify Strain
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            marginTop: 20,
            textAlign: "center",
            color: "#FFB74D",
            fontSize: 14,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(255,183,77,0.08)",
          }}>
            {error}
          </div>
        )}

        {/* ── RESULT CARD ── */}
        {result && scanState === "done" && (
          <div style={{ marginTop: 12 }}>
            {apiScanSummary && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: weakResult
                    ? "rgba(255,183,77,0.07)"
                    : "rgba(76,175,80,0.1)",
                  border: weakResult
                    ? "1px solid rgba(255,183,77,0.28)"
                    : "1px solid rgba(76,175,80,0.32)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    color: weakResult
                      ? "rgba(255,183,77,0.95)"
                      : "rgba(165,214,167,0.95)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  Scan summary
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 600,
                  }}
                >
                  {apiScanSummary}
                </p>
              </div>
            )}
            {scanPayloadFlags?.status === "needs_better_images" && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "rgba(255,152,0,0.1)",
                  border: "1px solid rgba(255,152,0,0.35)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1.1,
                    color: "rgba(255,193,7,0.95)",
                    marginBottom: 8,
                  }}
                >
                  Photo quality limits confidence
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.88)" }}>
                  For more reliable strain matching, use <strong style={{ color: "rgba(255,255,255,0.95)" }}>brighter, even lighting</strong>, keep the subject <strong style={{ color: "rgba(255,255,255,0.95)" }}>in sharp focus</strong>, let the flower <strong style={{ color: "rgba(255,255,255,0.95)" }}>fill more of the frame</strong>, and add <strong style={{ color: "rgba(255,255,255,0.95)" }}>2–5 angles</strong> (top, side, trichomes) when you can.
                </p>
              </div>
            )}
            {scanPayloadFlags?.resultType === "unresolved" && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: 6,
                  }}
                >
                  Match confidence
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
                  We don&apos;t have a strong cultivar match from this scan yet—the results below are best-effort. Try sharper, well-lit photos or a different angle if you want a clearer ID.
                </p>
              </div>
            )}
            <HybridScanLeadSections hybrid={hybridPresentation} />
            {/* Strain Name Hero */}
            <div style={{
              textAlign: "center",
              padding: "32px 0 20px",
            }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                  color: weakResult
                    ? "rgba(255,183,77,0.92)"
                    : "rgba(129,199,132,0.92)",
                  marginBottom: 10,
                }}
              >
                {weakResult ? "Best-effort match" : "Top cultivar match"}
              </div>
              <span
                style={{
                  fontSize: weakResult ? 34 : 40,
                  opacity: weakResult ? 0.88 : 1,
                  display: "inline-block",
                }}
              >
                {typeEmoji(result.type)}
              </span>
              <h1 style={{
                fontSize: weakResult ? 28 : 32,
                fontWeight: 800,
                margin: "12px 0 0",
                letterSpacing: -0.5,
                lineHeight: 1.1,
                color: weakResult ? "rgba(255,255,255,0.9)" : "#fff",
              }}>
                {result.strainName}
              </h1>
              {weakResult && (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.42)",
                    padding: "0 8px",
                  }}
                >
                  This is a visual suggestion—not a lab ID. Compare to your label or test results when it matters.
                </p>
              )}

              {/* Type + Confidence */}
              <div style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginTop: 14,
                flexWrap: "wrap",
              }}>
                <span style={{
                  background: typeGradient(result.type),
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}>
                  {result.type}
                </span>
                <span style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                }}>
                  {Math.round(Math.min(100, Math.max(0, result.confidence)))}% · {matchConfidenceTier(result.confidence)}
                </span>
              </div>

              {result.tagline && (
                <p style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 14,
                  marginTop: 12,
                  fontStyle: "italic",
                  letterSpacing: 0.2,
                }}>
                  &ldquo;{result.tagline}&rdquo;
                </p>
              )}

              {result.lineage && (
                <p style={{
                  color: "rgba(255,255,255,0.28)",
                  fontSize: 12,
                  marginTop: result.tagline ? 6 : 12,
                  fontStyle: "italic",
                }}>
                  {result.lineage}
                </p>
              )}

              {/* Save to history + favorites */}
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleSaveToHistory}
                    disabled={saveHistoryState === "saving"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 22px",
                      borderRadius: 20,
                      border:
                        saveHistoryState === "saved"
                          ? "1px solid rgba(76,175,80,0.55)"
                          : "1px solid rgba(76,175,80,0.45)",
                      background:
                        saveHistoryState === "saved"
                          ? "rgba(76,175,80,0.22)"
                          : "linear-gradient(135deg, rgba(67,160,71,0.35), rgba(46,125,50,0.2))",
                      color: saveHistoryState === "saved" ? "#A5D6A7" : "#E8F5E9",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: saveHistoryState === "saving" ? "default" : "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 2px 12px rgba(46,125,50,0.2)",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>
                      {saveHistoryState === "saved" ? "✓" : "📓"}
                    </span>
                    {saveHistoryState === "saving"
                      ? "Saving…"
                      : saveHistoryState === "saved"
                        ? "Added to history"
                        : "Save to history"}
                  </button>
                  <button
                    type="button"
                    onClick={saveFavorite}
                    disabled={isFavorited}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 20px",
                      borderRadius: 20,
                      border: isFavorited
                        ? "1px solid rgba(239,83,80,0.4)"
                        : "1px solid rgba(239,83,80,0.35)",
                      background: isFavorited ? "rgba(239,83,80,0.2)" : "rgba(255,255,255,0.06)",
                      color: isFavorited ? "#EF5350" : "rgba(255,255,255,0.55)",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isFavorited ? "default" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{isFavorited ? "❤️" : "🤍"}</span>
                    {isFavorited ? "Saved to Favorites" : "Save to Favorites"}
                  </button>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.28)",
                    textAlign: "center",
                    maxWidth: 280,
                    lineHeight: 1.45,
                  }}
                >
                  Each save adds a new entry—you can save again anytime for the same result.
                </p>
                {saveHistoryState === "error" && (
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,183,77,0.95)" }}>
                    Couldn&apos;t sync to the cloud—saved on this device. Try again when online.
                  </p>
                )}
                {saveHistoryState === "saved" && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(76,175,80,0.15)",
                      border: "1px solid rgba(76,175,80,0.35)",
                      textAlign: "center",
                      maxWidth: 320,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#A5D6A7" }}>
                      Saved — open it from Scan History anytime.
                    </p>
                  </div>
                )}
                {savedScanLinkId && (
                  <Link
                    href={savedScanResultsPath(savedScanLinkId)}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#81C784",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(129,199,132,0.4)",
                      paddingBottom: 2,
                    }}
                  >
                    Open this scan →
                  </Link>
                )}
              </div>
            </div>

            <HybridScanDetailSections hybrid={hybridPresentation} />

            {/* ── TAB BAR ─────────────────────────────────────── */}
            {(() => {
              const tabs: Array<{ key: typeof activeTab; label: string; icon: string }> = [
                { key: "overview", label: "Overview", icon: "🌿" },
                { key: "medical", label: "Medical", icon: "🏥" },
                { key: "grower", label: "Grower", icon: "🌱" },
                { key: "breeder", label: "Breeder", icon: "🧬" },
                { key: "dispensary", label: "Dispensary", icon: "🏪" },
              ];
              return (
                <div style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 18,
                  overflowX: "auto",
                  paddingBottom: 2,
                  scrollbarWidth: "none",
                }}>
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        flexShrink: 0,
                        padding: "8px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: activeTab === tab.key ? "1px solid rgba(76,175,80,0.5)" : "1px solid rgba(255,255,255,0.08)",
                        background: activeTab === tab.key ? "rgba(76,175,80,0.15)" : "rgba(255,255,255,0.04)",
                        color: activeTab === tab.key ? "#81C784" : "rgba(255,255,255,0.45)",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* ── OVERVIEW TAB ─────────────────────────────────── */}
            {activeTab === "overview" && (
              <div>

                {/* 🔍 THE HOOK — AI Detective's Report */}
                {result.description && (
                  <div style={{
                    padding: "20px",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, rgba(255,193,7,0.07), rgba(255,152,0,0.04))",
                    border: "1px solid rgba(255,193,7,0.22)",
                    marginBottom: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 18 }}>🔍</span>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, textTransform: "uppercase" as const, color: "rgba(255,193,7,0.75)" }}>AI Detective&apos;s Report</span>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.78)", margin: 0 }}>{result.description}</p>
                  </div>
                )}

                {/* 🎛️ Vibe Meter */}
                {result.vibeScore && (
                  <div style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", marginBottom: 16 }}>🎛️ Vibe Meter</div>
                    {([
                      { label: "Energizing", key: "energizing" as const, icon: "⚡", color: "#66BB6A" },
                      { label: "Creative",   key: "creative"   as const, icon: "🎨", color: "#AB47BC" },
                      { label: "Social",     key: "social"     as const, icon: "👥", color: "#42A5F5" },
                      { label: "Relaxing",   key: "relaxing"   as const, icon: "🌙", color: "#7E57C2" },
                    ] as const).map((v, i, arr) => {
                      const score = result.vibeScore![v.key];
                      const pct = Math.round((score / 10) * 100);
                      return (
                        <div key={v.key} style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{v.icon} {v.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: v.color }}>{score}/10</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 7, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 7, background: v.color, opacity: 0.8 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 🎯 Perfect For — Activity Pairings */}
                {result.activityPairing.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>🎯 Perfect For</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.activityPairing.map((a, i) => (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                          background: "rgba(79,195,247,0.09)", color: "rgba(179,229,252,0.9)",
                          border: "1px solid rgba(79,195,247,0.14)",
                        }}>
                          {activityEmoji(a)} {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 👅 Flavor & Aroma */}
                {(result.flavorNotes || result.aromaProfile) && (
                  <div style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>👅 Flavor &amp; Aroma</div>
                    {result.flavorNotes && (
                      <div style={{ display: "flex", gap: 10, marginBottom: result.aromaProfile ? 12 : 0 }}>
                        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>🍋</span>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 3 }}>Taste</div>
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", margin: 0, lineHeight: 1.6 }}>{result.flavorNotes}</p>
                        </div>
                      </div>
                    )}
                    {result.aromaProfile && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>🌸</span>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 3 }}>Aroma</div>
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", margin: 0, lineHeight: 1.6 }}>{result.aromaProfile}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 💚 Expert Tip */}
                {result.expertTip && (
                  <div style={{
                    padding: "16px 18px",
                    borderRadius: 16,
                    background: "linear-gradient(135deg, rgba(76,175,80,0.1), rgba(27,94,32,0.06))",
                    border: "1px solid rgba(76,175,80,0.22)",
                    marginBottom: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>💚</span>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(129,199,132,0.75)" }}>Expert Tip</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", margin: 0, lineHeight: 1.7 }}>{result.expertTip}</p>
                  </div>
                )}

                {/* Effects */}
                {result.effects.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Effects</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.effects.map((e, i) => (
                        <span key={i} style={{ padding: "8px 16px", borderRadius: 24, fontSize: 13, fontWeight: 600, background: "rgba(76,175,80,0.12)", color: "rgba(129,199,132,0.9)" }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terpenes */}
                {result.terpenes.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Terpenes</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.terpenes.map((t, i) => {
                        const colors = [
                          { bg: "rgba(171,71,188,0.12)", text: "rgba(206,147,216,0.9)" },
                          { bg: "rgba(255,183,77,0.12)", text: "rgba(255,213,79,0.9)" },
                          { bg: "rgba(79,195,247,0.12)", text: "rgba(129,212,250,0.9)" },
                          { bg: "rgba(255,138,101,0.12)", text: "rgba(255,171,145,0.9)" },
                        ];
                        const c = colors[i % colors.length];
                        return <span key={i} style={{ padding: "8px 16px", borderRadius: 24, fontSize: 13, fontWeight: 600, background: c.bg, color: c.text }}>{t}</span>;
                      })}
                    </div>
                  </div>
                )}

                {/* Visual Analysis */}
                {(result.budStructure || result.trichomes || result.coloration || result.visualTraits.length > 0) && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Visual Analysis</h3>
                    {result.budStructure && result.budStructure !== "Bud structure analysis complete" && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>🌿</span>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}><strong style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Structure: </strong>{result.budStructure}</p>
                      </div>
                    )}
                    {result.trichomes && result.trichomes !== "Trichome assessment complete" && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>💎</span>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}><strong style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Trichomes: </strong>{result.trichomes}</p>
                      </div>
                    )}
                    {result.coloration && result.coloration !== "Color analysis complete" && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>🎨</span>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}><strong style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Color: </strong>{result.coloration}</p>
                      </div>
                    )}
                    {result.visualTraits.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 6 }}>
                        {result.visualTraits.map((t, i) => (
                          <span key={i} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Could Also Be */}
                {result.alternates.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Could Also Be</h3>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                      {result.alternates.map((a, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
                          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{a.name}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{mapConfidence(a.confidence)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Better Results Tips */}
                {result.tips.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", marginBottom: 8 }}>
                    <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>Better Results</h3>
                    {result.tips.map((tip, i) => (
                      <p key={i} style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.4)", margin: "3px 0" }}>💡 {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MEDICAL TAB ──────────────────────────────────── */}
            {activeTab === "medical" && (
              <div>
                {result.medicalConditions.length > 0 && (
                  <div style={{ padding: "18px", borderRadius: 16, background: "linear-gradient(135deg, rgba(56,142,60,0.12), rgba(27,94,32,0.08))", border: "1px solid rgba(76,175,80,0.2)", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "#81C784", marginBottom: 12 }}>🏥 Reported Medical Benefits</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.medicalConditions.map((c, i) => (
                        <span key={i} style={{ padding: "8px 16px", borderRadius: 24, fontSize: 13, fontWeight: 700, background: "rgba(76,175,80,0.15)", color: "rgba(165,214,167,0.95)", border: "1px solid rgba(76,175,80,0.2)" }}>{c}</span>
                      ))}
                    </div>
                    {result.cbdContext && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>{result.cbdContext}</p>}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {result.intensity && (
                    <div style={{ padding: "14px 10px", borderRadius: 14, background: "rgba(255,255,255,0.04)", textAlign: "center" as const }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{result.intensity === "Mild" ? "🟢" : result.intensity === "Moderate" ? "🟡" : result.intensity === "Strong" ? "🟠" : "🔴"}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>Intensity</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{result.intensity}</div>
                    </div>
                  )}
                  {result.timeOfDay && (
                    <div style={{ padding: "14px 10px", borderRadius: 14, background: "rgba(255,255,255,0.04)", textAlign: "center" as const }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{result.timeOfDay === "Daytime" ? "☀️" : result.timeOfDay === "Nighttime" ? "🌙" : result.timeOfDay === "Evening" ? "🌆" : "🕐"}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>Best Time</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{result.timeOfDay}</div>
                    </div>
                  )}
                  {result.thc && (
                    <div style={{ padding: "14px 10px", borderRadius: 14, background: "rgba(255,255,255,0.04)", textAlign: "center" as const }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>🧪</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>THC</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#81C784", marginTop: 3 }}>{result.thc}</div>
                    </div>
                  )}
                  {result.cbd && (
                    <div style={{ padding: "14px 10px", borderRadius: 14, background: "rgba(255,255,255,0.04)", textAlign: "center" as const }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>💊</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>CBD</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#4FC3F7", marginTop: 3 }}>{result.cbd}</div>
                    </div>
                  )}
                  {result.duration && (
                    <div style={{ padding: "14px 10px", borderRadius: 14, background: "rgba(255,255,255,0.04)", textAlign: "center" as const }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>⏱️</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const }}>Duration</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{result.duration}</div>
                    </div>
                  )}
                </div>
                {(result.cautions || result.sideEffects.length > 0) && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,152,0,0.06)", border: "1px solid rgba(255,152,0,0.18)", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,183,77,0.8)", margin: 0 }}>Cautions</h3>
                    </div>
                    {result.cautions && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 10px" }}>{result.cautions}</p>}
                    {result.sideEffects.length > 0 && (
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const }}>
                        {result.sideEffects.map((s, i) => (
                          <span key={i} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(255,152,0,0.1)", color: "rgba(255,213,79,0.8)" }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {result.bestUse.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Best For</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.bestUse.map((u, i) => (
                        <span key={i} style={{ padding: "8px 16px", borderRadius: 24, fontSize: 13, fontWeight: 600, background: "rgba(255,183,77,0.1)", color: "rgba(255,213,79,0.85)" }}>{u}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── GROWER TAB ───────────────────────────────────── */}
            {activeTab === "grower" && (
              <div>
                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Difficulty", value: result.growDifficulty, icon: "⚡" },
                    { label: "Flowering", value: result.floweringTime, icon: "🌸" },
                    { label: "Veg Time", value: result.vegetativeTime, icon: "🌿" },
                    { label: "Plant Height", value: result.plantHeight, icon: "📏" },
                    { label: "Indoor Yield", value: result.yieldIndoor, icon: "🏠" },
                    { label: "Outdoor Yield", value: result.yieldOutdoor, icon: "☀️" },
                    { label: "Mold Resistance", value: result.moldResistance, icon: "🛡️" },
                    { label: "Pest Resistance", value: result.pestResistance, icon: "🐛" },
                    { label: "Cure Time", value: result.cureTime, icon: "⏰" },
                  ].filter(s => s.value).map((stat, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 4 }}>{stat.icon} {stat.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                {result.trainingMethods.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Training Methods</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.trainingMethods.map((m, i) => (
                        <span key={i} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(79,195,247,0.1)", color: "rgba(129,212,250,0.85)" }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.nutrientNeeds && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 6 }}>🌊 Nutrient Profile</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.nutrientNeeds}</p>
                  </div>
                )}
                {result.climate && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 6 }}>🌡️ Ideal Climate</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.climate}</p>
                  </div>
                )}
                {result.harvestIndicators && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,183,77,0.06)", border: "1px solid rgba(255,183,77,0.15)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,213,79,0.6)", textTransform: "uppercase" as const, marginBottom: 6 }}>🔬 Harvest Indicators</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.harvestIndicators}</p>
                  </div>
                )}
                {result.growNotes && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(76,175,80,0.05)", border: "1px solid rgba(76,175,80,0.12)", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(129,199,132,0.6)", textTransform: "uppercase" as const, marginBottom: 6 }}>📝 Grow Notes</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.growNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── BREEDER TAB ──────────────────────────────────── */}
            {activeTab === "breeder" && (
              <div>
                {result.originStory && (
                  <div style={{ padding: "16px", borderRadius: 14, background: "rgba(171,71,188,0.07)", border: "1px solid rgba(171,71,188,0.2)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(206,147,216,0.7)", textTransform: "uppercase" as const, marginBottom: 8 }}>🧬 Origin Story</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.7 }}>{result.originStory}</p>
                  </div>
                )}
                {(result.parentStrains.length > 0 || result.grandparentStrains.length > 0) && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 10 }}>🌳 Genetic Lineage</div>
                    {result.parentStrains.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Parent Strains</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                          {result.parentStrains.map((p, i) => (
                            <span key={i} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "rgba(171,71,188,0.15)", color: "rgba(206,147,216,0.9)" }}>{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.grandparentStrains.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>Grandparent Strains</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                          {result.grandparentStrains.map((g, i) => (
                            <span key={i} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(171,71,188,0.08)", color: "rgba(206,147,216,0.6)" }}>{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Genetic Stability", value: result.geneticStability, icon: "📊" },
                    { label: "Seed Types", value: result.seedTypes, icon: "🌱" },
                  ].filter(s => s.value).map((stat, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 4 }}>{stat.icon} {stat.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                {result.phenotypeVariation && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 6 }}>🎭 Phenotype Variation</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.phenotypeVariation}</p>
                  </div>
                )}
                {result.terpeneInheritance && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 6 }}>🧪 Terpene Inheritance</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.terpeneInheritance}</p>
                  </div>
                )}
                {result.breedingPotential && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(171,71,188,0.05)", border: "1px solid rgba(171,71,188,0.15)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(206,147,216,0.6)", textTransform: "uppercase" as const, marginBottom: 6 }}>✨ Breeding Potential</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.breedingPotential}</p>
                  </div>
                )}
                {result.breedingNotes && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 6 }}>📝 Breeder Notes</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{result.breedingNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── DISPENSARY TAB ───────────────────────────────── */}
            {activeTab === "dispensary" && (
              <div>
                {result.salesDescription && (
                  <div style={{ padding: "18px", borderRadius: 16, background: "linear-gradient(135deg, rgba(255,183,77,0.08), rgba(255,87,34,0.05))", border: "1px solid rgba(255,183,77,0.2)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,213,79,0.7)", marginBottom: 8 }}>🏪 Product Pitch</div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.6 }}>{result.salesDescription}</p>
                  </div>
                )}
                {result.menuDescription && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, marginBottom: 4 }}>📋 Menu Copy</div>
                    <p style={{ fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.7)", margin: 0 }}>"{result.menuDescription}"</p>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Pricing Tier", value: result.pricingTier, icon: "💰" },
                    { label: "Experience Level", value: result.experienceLevel, icon: "🎯" },
                    { label: "Target Customer", value: result.targetCustomer, icon: "👤" },
                  ].filter(s => s.value).map((stat, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", gridColumn: stat.label === "Target Customer" ? "span 2" : undefined }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 4 }}>{stat.icon} {stat.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                {(result.flavorNotes || result.aromaProfile) && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 14 }}>
                    {result.flavorNotes && (
                      <div style={{ marginBottom: result.aromaProfile ? 10 : 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 4 }}>👅 Flavor Profile</div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>{result.flavorNotes}</p>
                      </div>
                    )}
                    {result.aromaProfile && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 4, marginTop: result.flavorNotes ? 10 : 0 }}>👃 Aroma</div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>{result.aromaProfile}</p>
                      </div>
                    )}
                  </div>
                )}
                {result.bestProductForms.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Best Product Forms</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.bestProductForms.map((f, i) => (
                        <span key={i} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: "rgba(255,183,77,0.1)", color: "rgba(255,213,79,0.85)" }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.activityPairing.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Activity Pairings</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {result.activityPairing.map((a, i) => (
                        <span key={i} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: "rgba(79,195,247,0.1)", color: "rgba(129,212,250,0.85)" }}>{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.marketingTags.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Menu Tags</h3>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const }}>
                      {result.marketingTags.map((t, i) => (
                        <span key={i} style={{ padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 700, background: "rgba(239,83,80,0.1)", color: "rgba(239,154,154,0.85)", border: "1px solid rgba(239,83,80,0.15)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.consultingScript && (
                  <div style={{ padding: "16px", borderRadius: 14, background: "rgba(76,175,80,0.05)", border: "1px solid rgba(76,175,80,0.15)", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(129,199,132,0.7)", textTransform: "uppercase" as const, marginBottom: 8 }}>💬 Budtender Script</div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.7, fontStyle: "italic" }}>"{result.consultingScript}"</p>
                  </div>
                )}
              </div>
            )}

            {/* ── WHAT'S NEXT ──────────────────────────────────────── */}
            <div style={{ marginTop: 24, marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.2)", marginBottom: 12, textAlign: "center" as const }}>Explore More</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <a href="/garden/dispensaries" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "16px 12px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" as const, cursor: "pointer" }}>
                    <div style={{ fontSize: 24, marginBottom: 5 }}>🏪</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>Find Nearby</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Dispensaries</div>
                  </div>
                </a>
                <a href="/garden/strains" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "16px 12px", borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" as const, cursor: "pointer" }}>
                    <div style={{ marginBottom: 5, display: "flex", justifyContent: "center" }}><img src="/brand/cannabis-icon.png" width={24} height={24} alt="" style={{ display: 'inline-block', flexShrink: 0, borderRadius: '50%' }} /></div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>Browse Strains</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>35k+ cultivars</div>
                  </div>
                </a>
                <button
                  onClick={() => { setActiveTab("medical"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  style={{ padding: "16px 12px", borderRadius: 16, background: "rgba(56,142,60,0.07)", border: "1px solid rgba(76,175,80,0.13)", textAlign: "center" as const, cursor: "pointer" }}
                >
                  <div style={{ fontSize: 24, marginBottom: 5 }}>🏥</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(129,199,132,0.8)" }}>Medical Info</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Benefits &amp; cautions</div>
                </button>
                <button
                  onClick={() => { setActiveTab("grower"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  style={{ padding: "16px 12px", borderRadius: 16, background: "rgba(56,142,60,0.07)", border: "1px solid rgba(76,175,80,0.13)", textAlign: "center" as const, cursor: "pointer" }}
                >
                  <div style={{ fontSize: 24, marginBottom: 5 }}>🌱</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(129,199,132,0.8)" }}>Grow Guide</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Tips &amp; yield data</div>
                </button>
              </div>
            </div>

            {/* Community photo contribution notice */}
            {photoContributed && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px", borderRadius: 12, marginBottom: 4,
                background: photoContributed === "verified"
                  ? "rgba(102,187,106,0.08)" : "rgba(79,195,247,0.07)",
                border: photoContributed === "verified"
                  ? "1px solid rgba(102,187,106,0.2)" : "1px solid rgba(79,195,247,0.15)",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>
                  {photoContributed === "verified" ? "✅" : "📸"}
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: photoContributed === "verified" ? "#81C784" : "#4FC3F7", marginBottom: 2 }}>
                    {photoContributed === "verified"
                      ? "Photo added to the community database"
                      : "Photo saved to your history"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                    {photoContributed === "verified"
                      ? "Your high-confidence scan is now visible on the terpene deep dive pages, helping others identify this strain."
                      : "Reach 80%+ match confidence to have your photo contribute to the shared community gallery."}
                  </div>
                </div>
              </div>
            )}

            {/* Similar Strains */}
            <SimilarStrains result={result} />

            {/* ── Why Accuracy Varies ── */}
            <div style={{
              padding: "18px 20px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>
                  Why Confidence Isn&apos;t Always 100%
                </span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {([
                  { icon: "🌿", title: "Visual overlap is real", body: "Hundreds of strains share nearly identical color, bud structure, and trichome density. Purple Kush, Blackberry, and Granddaddy Purple can be almost indistinguishable in a photo." },
                  { icon: "🌡️", title: "Grow conditions shift appearance", body: "Temperature swings, nutrients, light spectrum, and cure time all change how a strain looks — sometimes more dramatically than genetics do." },
                  { icon: "🧬", title: "Phenotype variation", body: "Two clones from the same mother plant can look completely different. The AI sees the phenotype you grew, not necessarily the label on the jar." },
                  { icon: "📸", title: "Photo quality matters", body: "Macro shots under white light with multiple angles give the best match rates. Blurry shots or warm grow-tent light drops confidence significantly." },
                ] as Array<{ icon: string; title: string; body: string }>).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.65, marginTop: 1 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.58)", marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.55 }}>{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(102,187,106,0.05)", border: "1px solid rgba(102,187,106,0.11)" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: "rgba(102,187,106,0.65)" }}>You help us get better.</strong> Every scan you contribute trains the model to better distinguish look-alike cultivars. The more the community uses it, the sharper the AI gets.
                </p>
              </div>
            </div>

            {/* Scan Again */}
            <div style={{
              textAlign: "center",
              paddingTop: 12,
              paddingBottom: 40,
            }}>
              <button
                onClick={clearAll}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: 50,
                  padding: "14px 40px",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Scan Another
              </button>
            </div>

            {/* Disclaimer */}
            <p style={{
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              lineHeight: 1.5,
              paddingBottom: 20,
            }}>
              AI-assisted visual analysis. Not a substitute for lab testing.
              Results are for educational purposes only.
            </p>
          </div>
        )}

        {/* ── EMPTY STATE TIPS ── */}
        {scanState === "idle" && (
          <div style={{
            textAlign: "center",
            marginTop: 32,
            padding: "0 12px",
          }}>
            <div style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginBottom: 28,
            }}>
              {[
                { icon: "📐", label: "Multiple angles" },
                { icon: "💡", label: "Good lighting" },
                { icon: "🔬", label: "Close-up detail" },
              ].map((tip, i) => (
                <div key={i} style={{
                  textAlign: "center",
                  flex: "0 1 90px",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{tip.icon}</div>
                  <div style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                    lineHeight: 1.3,
                  }}>
                    {tip.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Garden Enticement ── */}
            <div style={{
              padding: "22px 20px 20px",
              borderRadius: 20,
              background: "linear-gradient(145deg, rgba(46,125,50,0.1), rgba(27,94,32,0.05))",
              border: "1px solid rgba(102,187,106,0.18)",
              textAlign: "left",
              marginBottom: 20,
            }}>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><img src="/brand/cannabis-icon.png" width={40} height={40} alt="" style={{ display: 'inline-block', flexShrink: 0, borderRadius: '50%' }} /></div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#fff", marginBottom: 6 }}>
                  {isLoggedIn ? "Explore Your Garden" : "The Scanner Is Just the Start"}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                  {isLoggedIn
                    ? "You've got a full suite of cannabis tools waiting for you."
                    : "Create a free account and unlock a full cannabis companion app — built for growers, consumers, and dispensary pros."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
                {([
                  { icon: "🔬", title: "Strain Library", body: "35K+ strains with full genetics & effects" },
                  { icon: "🧬", title: "Discovery", body: "Filter by effect, terpene, and experience" },
                  { icon: "🧪", title: "Terpenes", body: "Deep dives + community photos" },
                  { icon: "⚖️", title: "Compare", body: "Side-by-side strain comparison" },
                  { icon: "🌱", title: "Grow Coach", body: "AI analysis on every journal entry" },
                  { icon: "📍", title: "Directory", body: "Dispensaries & licensed growers nearby" },
                  { icon: "🌰", title: "Seed Vendors", body: "Trusted seed sources worldwide" },
                  { icon: "❤️", title: "Favorites", body: "Your personal strain collection" },
                  { icon: "📓", title: "Journal", body: "Log sessions & track mood over time" },
                  { icon: "👤", title: "Profile", body: "Your stats, personality type & history" },
                  { icon: "🕑", title: "Scan History", body: "Every ID saved and searchable forever" },
                  { icon: "💬", title: "Community", body: "Connect with growers & dispensaries" },
                ] as Array<{ icon: string; title: string; body: string }>).map((f, i) => (
                  <div key={i} style={{
                    padding: "10px 10px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{ fontSize: 15, marginBottom: 3 }}>{f.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", lineHeight: 1.35 }}>{f.body}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => isLoggedIn ? router.push("/garden") : setShowAuth(true)}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 14,
                  background: "linear-gradient(135deg, #43A047, #2E7D32)",
                  border: "none", color: "#fff", fontSize: 15, fontWeight: 800,
                  cursor: "pointer", letterSpacing: 0.3,
                  boxShadow: "0 4px 18px rgba(67,160,71,0.3)",
                }}
              >
                {isLoggedIn ? "Open My Garden →" : "Join the Garden — Free"}
              </button>
              {!isLoggedIn && (
                <p style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 0 }}>
                  Free to join. Upgrade anytime for unlimited scans.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes scanPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.6; }
        }
        @keyframes leafSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-15deg) scale(1.05); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(15deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `}</style>

      {/* Photo Consent Modal */}
      {showConsentModal && result && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 16px 32px",
        }}
          onClick={() => setShowConsentModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440,
              background: "linear-gradient(180deg, #111a11 0%, #0d150d 100%)",
              border: "1px solid rgba(102,187,106,0.25)",
              borderRadius: 24, padding: "24px 22px 28px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>📸</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 8 }}>
                Help us build better AI
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>
                Your scan of <strong style={{ color: "#81C784" }}>{result.strainName}</strong> matched at {Math.round(result.confidence)}% confidence. Allow StrainSpotter to use this photo to improve strain identification for everyone?
              </div>
            </div>

            <div style={{
              background: "rgba(102,187,106,0.08)", border: "1px solid rgba(102,187,106,0.2)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 20,
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🎁</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#81C784", marginBottom: 3 }}>
                  Help improve StrainSpotter
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                  Your photo helps train our AI to better identify this cultivar for everyone. Contribute anonymously — no personal data attached.
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 18, lineHeight: 1.5 }}>
              Your photo may appear on terpene and strain pages to help other users identify this cultivar. You can opt out any time from Settings. We never sell your data.
            </div>

            <button
              onClick={() => {
                setCreditEarned(true);
                localStorage.setItem(`ss_consented_${result.strainName}`, "1");
                setShowConsentModal(false);
              }}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14, marginBottom: 10,
                background: "linear-gradient(135deg, #43A047, #2E7D32)",
                border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
              }}
            >
              Yes — Contribute Photo
            </button>
            <button
              onClick={() => {
                localStorage.setItem(`ss_consented_${result.strainName}`, "declined");
                setShowConsentModal(false);
              }}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 14,
                background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              No thanks, skip
            </button>
          </div>
        </div>
      )}

      {/* Credit earned toast */}
      {creditEarned && (
        <div
          style={{
            position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
            zIndex: 300, background: "linear-gradient(135deg, #43A047, #2E7D32)",
            borderRadius: 50, padding: "10px 20px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 24px rgba(67,160,71,0.4)",
          }}
          onAnimationEnd={() => setTimeout(() => setCreditEarned(false), 2000)}
        >
          <span style={{ fontSize: 16 }}>🎁</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>+1 bonus scan earned!</span>
        </div>
      )}

      {/* Auth overlay */}
      {showAuth && (
        <AuthScreen
          defaultMode="signin"
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
          }}
        />
      )}
    </div>
  );
}
