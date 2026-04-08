"use client";

import { useState, useRef, useCallback } from "react";
import { orchestrateScan } from "@/lib/scanner/scanOrchestrator";
import type { ScanMode } from "@/lib/scanner/scanOrchestrator";
import Link from "next/link";
import AuthScreen from "@/components/AuthScreen";

/* ─── try to use real auth, fall back gracefully ─── */
let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

function getLocalTier(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("ss_tier"); } catch { return null; }
}
function tierLabel(t: string) { return t === "pro" ? "Pro" : t === "member" ? "Member" : "Free"; }
function tierColor(t: string) { return t === "pro" ? "#FFD700" : t === "member" ? "#4CAF50" : "rgba(255,255,255,0.35)"; }

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   StrainSpotter Scanner v2
   Quality Grading • Dual Mode • Problem Detection
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type ScanState = "idle" | "ready" | "scanning" | "done";

/* ─── Consumer result ─── */
interface ConsumerResult {
  strainName: string;
  confidence: number;
  confidenceLabel: string;
  type: "Indica" | "Sativa" | "Hybrid" | "Unknown";
  lineage: string;
  effects: string[];
  terpenes: Array<{ name: string; confidence: number; aroma?: string }>;
  description: string;
  alternates: Array<{ name: string; confidence: number }>;
  quality: {
    grade: string;
    score: number;
    breakdown: Record<string, number>;
    summary: string;
  };
  morphology: {
    budStructure: string;
    coloration: string;
    trichomes: string;
    trichomeMaturity: { clear: number; cloudy: number; amber: number };
    pistils: string;
    visualTraits: string[];
  };
  chemistry: {
    cannabinoids: { THC: string; CBD: string };
    predictedExperience: string;
  };
  problems: {
    detected: boolean;
    issues: Array<{ type: string; severity: string; description: string; action: string }>;
    safetyVerdict: string;
  };
  experience: {
    onset: string;
    duration: string;
    bestFor: string[];
    avoidIf: string | null;
  };
  cultivation: {
    difficulty: string;
    floweringTime: string;
    yield: string;
    growTips: string[];
  };
  reasoning: {
    whyThisMatch: string;
    conflictingSignals: string[] | null;
    analysisNotes: string | null;
  };
}

/* ─── Grower result ─── */
interface GrowerResult {
  strainName: string;
  confidence: number;
  type: string;
  health: { score: number; status: string; summary: string };
  growthStage: { stage: string; estimatedAge: string; daysToHarvest: number | null; harvestWindow: string };
  trichomes: { visible: boolean; maturity: { clear: number; cloudy: number; amber: number }; assessment: string };
  problems: { detected: boolean; issues: Array<{ type: string; severity: string; description: string; immediateAction: string }>; overallRisk: string };
  nutrients: { status: string; deficiencies: Array<{ nutrient: string; severity: string; signs: string }>; feedingAdvice: string };
  environment: { growType: string; lightAssessment: string; stressIndicators: string[] | null };
  actionItems: { urgent: string[] | null; recommended: string[]; watchFor: string[] };
  genetics: { dominance: string; morphotype: string };
}

/* ─── Helpers ─── */
function mapConfidence(n: number): string {
  if (n >= 85) return "Strong Match";
  if (n >= 70) return "Good Match";
  if (n >= 55) return "Possible Match";
  return "Low Match";
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

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#4CAF50";
  if (grade.startsWith("B")) return "#8BC34A";
  if (grade.startsWith("C")) return "#FFC107";
  if (grade === "D") return "#FF9800";
  return "#F44336";
}

function gradeEmoji(grade: string): string {
  if (grade === "A+" || grade === "A") return "🏆";
  if (grade === "A-") return "⭐";
  if (grade.startsWith("B")) return "👍";
  if (grade.startsWith("C")) return "👌";
  return "⚠️";
}

function safetyColor(verdict: string): string {
  if (verdict === "Clean") return "#4CAF50";
  if (verdict === "Caution") return "#FFC107";
  if (verdict === "Warning") return "#FF9800";
  return "#F44336";
}

function safetyEmoji(verdict: string): string {
  if (verdict === "Clean") return "✅";
  if (verdict === "Caution") return "⚠️";
  if (verdict === "Warning") return "🟠";
  return "🚫";
}

function healthColor(status: string): string {
  if (status === "Thriving") return "#4CAF50";
  if (status === "Healthy") return "#8BC34A";
  if (status === "Fair") return "#FFC107";
  if (status === "Stressed") return "#FF9800";
  return "#F44336";
}

function riskColor(risk: string): string {
  if (risk === "None") return "#4CAF50";
  if (risk === "Low") return "#8BC34A";
  if (risk === "Medium") return "#FFC107";
  if (risk === "High") return "#FF9800";
  return "#F44336";
}

/* ─── Shared styles ─── */
const cardStyle: React.CSSProperties = {
  padding: "16px 18px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.04)",
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.3)",
  marginBottom: 10,
  marginTop: 0,
};
const chipWrap: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" as const };
const chipBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 24,
  fontSize: 13,
  fontWeight: 600,
};

/* ━━━━━━━━━━━━━━━━━━━ COMPONENT ━━━━━━━━━━━━━━━━━━━ */
export default function ScannerPage() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [mode, setMode] = useState<ScanMode>("consumer");
  const [consumerResult, setConsumerResult] = useState<ConsumerResult | null>(null);
  const [growerResult, setGrowerResult] = useState<GrowerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 5;

  const auth = useOptionalAuth();
  const isLoggedIn = !!auth?.user;
  const displayName = auth?.profile?.display_name || auth?.user?.email?.split("@")[0] || null;
  const tier = auth?.tier || getLocalTier() || "free";

  /* ─── Image handling ─── */
  const addImages = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArr.length === 0) return;
    setImages((prev) => {
      const combined = [...prev, ...fileArr].slice(0, MAX_IMAGES);
      setPreviews((old) => {
        old.forEach((u) => URL.revokeObjectURL(u));
        return combined.map((f) => URL.createObjectURL(f));
      });
      return combined;
    });
    setScanState("ready");
    setError(null);
  }, []);

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setPreviews((old) => {
        URL.revokeObjectURL(old[idx]);
        return old.filter((_, i) => i !== idx);
      });
      if (next.length === 0) setScanState("idle");
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) addImages(e.dataTransfer.files);
    },
    [addImages]
  );

  /* ─── Scan ─── */
  const handleScan = useCallback(async () => {
    if (images.length === 0) return;
    setScanState("scanning");
    setError(null);
    setConsumerResult(null);
    setGrowerResult(null);
    setActiveTab("overview");

    try {
      const result = await orchestrateScan(images, mode);

      if (result.confidencePercent === 0 && result.displayName === "Analysis Failed") {
        setError(result.summary[0] || "Scan failed — please try again");
        setScanState("ready");
        return;
      }

      const full = result.fullResult;
      if (mode === "consumer" && full) {
        setConsumerResult({
          strainName: full.identity?.strainName || result.displayName,
          confidence: full.identity?.confidence || result.confidencePercent,
          confidenceLabel: mapConfidence(full.identity?.confidence || result.confidencePercent),
          type: full.genetics?.dominance || "Hybrid",
          lineage: Array.isArray(full.genetics?.lineage) ? full.genetics.lineage.join(" × ") : "",
          effects: full.experience?.effects || [],
          terpenes: full.chemistry?.terpenes || [],
          description: full.chemistry?.predictedExperience || full.reasoning?.whyThisMatch || "",
          alternates: (full.identity?.alternateMatches || []).map((a: any) => ({ name: a.strainName, confidence: a.confidence })),
          quality: full.quality || { grade: "B", score: 70, breakdown: {}, summary: "" },
          morphology: full.morphology || {},
          chemistry: { cannabinoids: full.chemistry?.cannabinoids || { THC: "?", CBD: "?" }, predictedExperience: full.chemistry?.predictedExperience || "" },
          problems: full.problems || { detected: false, issues: [], safetyVerdict: "Clean" },
          experience: full.experience || { onset: "?", duration: "?", bestFor: [], avoidIf: null },
          cultivation: full.cultivation || { difficulty: "?", floweringTime: "?", yield: "?", growTips: [] },
          reasoning: full.reasoning || { whyThisMatch: "", conflictingSignals: null, analysisNotes: null },
        });
      } else if (mode === "grower" && full) {
        setGrowerResult({
          strainName: full.identity?.strainName || result.displayName,
          confidence: full.identity?.confidence || result.confidencePercent,
          type: full.genetics?.dominance || "Hybrid",
          health: full.health || { score: 0, status: "Unknown", summary: "" },
          growthStage: full.growthStage || { stage: "Unknown", estimatedAge: "?", daysToHarvest: null, harvestWindow: "Unknown" },
          trichomes: full.trichomes || { visible: false, maturity: { clear: 33, cloudy: 34, amber: 33 }, assessment: "" },
          problems: full.problems || { detected: false, issues: [], overallRisk: "None" },
          nutrients: full.nutrients || { status: "Unknown", deficiencies: [], feedingAdvice: "" },
          environment: full.environment || { growType: "Unknown", lightAssessment: "", stressIndicators: null },
          actionItems: full.actionItems || { urgent: null, recommended: [], watchFor: [] },
          genetics: full.genetics || { dominance: "Hybrid", morphotype: "" },
        });
      }

      setScanState("done");
    } catch (err) {
      console.error("Scan error:", err);
      setError("Something went wrong — please try again");
      setScanState("ready");
    }
  }, [images, mode]);

  /* ─── Reset ─── */
  const handleReset = useCallback(() => {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages([]);
    setPreviews([]);
    setScanState("idle");
    setConsumerResult(null);
    setGrowerResult(null);
    setError(null);
    setActiveTab("overview");
  }, [previews]);

  /* ━━━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━━━ */
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #0a0f0a 0%, #0d120d 100%)",
        color: "#fff",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: "antialiased",
        position: "relative",
      }}
    >
      {showAuth && <AuthScreen onClose={() => setShowAuth(false)} />}

      <style>{`
        @keyframes scanPulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.02); } }
        @keyframes leafSpin { 0% { transform: rotate(0deg); } 50% { transform: rotate(15deg); } 100% { transform: rotate(0deg); } }
        @keyframes gradeIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/garden" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🌿</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>StrainSpotter</span>
        </Link>

        {isLoggedIn ? (
          <button onClick={() => {}} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#fff" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: tierColor(tier), background: `${tierColor(tier)}18`, border: `1px solid ${tierColor(tier)}44`, borderRadius: 5, padding: "2px 6px" }}>{tierLabel(tier)}</span>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #43A047, #2E7D32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
              {(displayName || "?")[0].toUpperCase()}
            </div>
          </button>
        ) : (
          <button onClick={() => setShowAuth(true)} style={{ background: "linear-gradient(135deg, #43A047, #2E7D32)", border: "none", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Sign In
          </button>
        )}
      </div>

      <div style={{ padding: "0 20px 100px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── MODE TOGGLE ── */}
        {scanState !== "done" && (
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16, padding: 4, borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
            {(["consumer", "grower"] as ScanMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: mode === m ? "rgba(76,175,80,0.2)" : "transparent",
                  color: mode === m ? "#81C784" : "rgba(255,255,255,0.4)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {m === "consumer" ? "🔍 Identify & Grade" : "🌱 Grow Analysis"}
              </button>
            ))}
          </div>
        )}

        {/* ── MODE DESCRIPTION ── */}
        {scanState !== "done" && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            {mode === "consumer"
              ? "Identify strains, get quality grades, and check for problems"
              : "Analyze plant health, harvest timing, and get grow advice"}
          </p>
        )}

        {/* ── UPLOAD AREA ── */}
        {scanState !== "done" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              margin: "24px auto 0",
              width: "100%",
              maxWidth: 340,
              aspectRatio: "1",
              borderRadius: "50%",
              background:
                scanState === "scanning"
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
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: scanState === "scanning" ? "2px solid rgba(76,175,80,0.6)" : images.length > 0 ? "2px solid rgba(76,175,80,0.3)" : "2px solid rgba(255,255,255,0.08)", animation: scanState === "scanning" ? "scanPulse 2s ease-in-out infinite" : "none" }} />
            <div style={{ position: "absolute", inset: 20, borderRadius: "50%", border: scanState === "scanning" ? "1px solid rgba(76,175,80,0.3)" : "1px solid rgba(255,255,255,0.04)", animation: scanState === "scanning" ? "scanPulse 2s ease-in-out infinite 0.5s" : "none" }} />

            {scanState === "scanning" ? (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{ fontSize: 56, animation: "leafSpin 3s ease-in-out infinite", marginBottom: 16 }}>🍃</div>
                <p style={{ color: "rgba(76,175,80,0.9)", fontSize: 16, fontWeight: 600 }}>
                  {mode === "consumer" ? "Identifying & Grading..." : "Analyzing Plant Health..."}
                </p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>AI is working its magic</p>
              </div>
            ) : images.length > 0 ? (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.9 }}>📸</div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>{images.length} photo{images.length > 1 ? "s" : ""} ready</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>Tap to add more (up to {MAX_IMAGES})</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.6 }}>{mode === "consumer" ? "🔍" : "🌱"}</div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 600 }}>Upload Photos</p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 6 }}>
                  {mode === "consumer" ? "2–5 photos of buds work best" : "Show the whole plant or problem areas"}
                </p>
              </div>
            )}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }} />

        {/* ── THUMBNAIL STRIP ── */}
        {images.length > 0 && scanState !== "done" && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
                <button onClick={(e) => { e.stopPropagation(); removeImage(i); }} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── SCAN BUTTON ── */}
        {scanState === "ready" && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
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
              {mode === "consumer" ? "Identify & Grade" : "Analyze Grow"}
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={{ marginTop: 20, textAlign: "center", color: "#FFB74D", fontSize: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,183,77,0.08)" }}>
            {error}
          </div>
        )}

        {/* ━━━━━━━━━━ CONSUMER RESULTS ━━━━━━━━━━ */}
        {consumerResult && scanState === "done" && (
          <div style={{ marginTop: 12 }}>
            {/* Hero: Strain + Grade */}
            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 40 }}>{typeEmoji(consumerResult.type)}</span>
                <div style={{ animation: "gradeIn 0.5s ease-out", textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: gradeColor(consumerResult.quality.grade), lineHeight: 1 }}>
                    {gradeEmoji(consumerResult.quality.grade)} {consumerResult.quality.grade}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginTop: 2 }}>QUALITY</div>
                </div>
              </div>

              <h1 style={{ fontSize: 28, fontWeight: 800, margin: "14px 0 0", letterSpacing: -0.5, lineHeight: 1.1 }}>
                {consumerResult.strainName}
              </h1>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ background: typeGradient(consumerResult.type), padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{consumerResult.type}</span>
                <span style={{ background: "rgba(255,255,255,0.08)", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{consumerResult.confidenceLabel}</span>
                <span style={{ background: `${safetyColor(consumerResult.problems.safetyVerdict)}18`, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: safetyColor(consumerResult.problems.safetyVerdict) }}>
                  {safetyEmoji(consumerResult.problems.safetyVerdict)} {consumerResult.problems.safetyVerdict}
                </span>
              </div>

              {consumerResult.lineage && (
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 10, fontStyle: "italic" }}>{consumerResult.lineage}</p>
              )}
            </div>

            {/* Quality Summary */}
            <div style={{ ...cardStyle, borderLeft: `3px solid ${gradeColor(consumerResult.quality.grade)}` }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: 0 }}>{consumerResult.quality.summary}</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: 2, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
              {["overview", "quality", "science", "growing", "safety"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: activeTab === tab ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.04)",
                    color: activeTab === tab ? "#81C784" : "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <>
                {/* Effects */}
                {consumerResult.effects.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={labelStyle}>Effects</h3>
                    <div style={chipWrap}>
                      {consumerResult.effects.map((e, i) => (
                        <span key={i} style={{ ...chipBase, background: "rgba(76,175,80,0.12)", color: "rgba(129,199,132,0.9)" }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terpenes */}
                {consumerResult.terpenes.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={labelStyle}>Terpenes</h3>
                    <div style={chipWrap}>
                      {consumerResult.terpenes.map((t, i) => {
                        const colors = [
                          { bg: "rgba(171,71,188,0.12)", text: "rgba(206,147,216,0.9)" },
                          { bg: "rgba(255,183,77,0.12)", text: "rgba(255,213,79,0.9)" },
                          { bg: "rgba(79,195,247,0.12)", text: "rgba(129,212,250,0.9)" },
                          { bg: "rgba(255,138,101,0.12)", text: "rgba(255,171,145,0.9)" },
                        ];
                        const c = colors[i % colors.length];
                        return (
                          <span key={i} style={{ ...chipBase, background: c.bg, color: c.text }}>
                            {t.name}{t.aroma ? ` (${t.aroma})` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Experience */}
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Experience</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Onset</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{consumerResult.experience.onset}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Duration</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{consumerResult.experience.duration}</div>
                    </div>
                  </div>
                  {consumerResult.experience.bestFor.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Best For</div>
                      <div style={chipWrap}>
                        {consumerResult.experience.bestFor.map((u, i) => (
                          <span key={i} style={{ ...chipBase, background: "rgba(79,195,247,0.1)", color: "rgba(129,212,250,0.8)", fontSize: 12 }}>{u}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {consumerResult.experience.avoidIf && (
                    <p style={{ fontSize: 12, color: "rgba(255,183,77,0.7)", marginTop: 10, marginBottom: 0 }}>⚠️ {consumerResult.experience.avoidIf}</p>
                  )}
                </div>

                {/* Cannabinoids */}
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Cannabinoids</h3>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#81C784" }}>{consumerResult.chemistry.cannabinoids.THC}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>THC</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#80CBC4" }}>{consumerResult.chemistry.cannabinoids.CBD}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>CBD</div>
                    </div>
                  </div>
                  {consumerResult.chemistry.predictedExperience && (
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>{consumerResult.chemistry.predictedExperience}</p>
                  )}
                </div>

                {/* Why This Match */}
                {consumerResult.reasoning.whyThisMatch && (
                  <div style={cardStyle}>
                    <h3 style={labelStyle}>Why This Match</h3>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{consumerResult.reasoning.whyThisMatch}</p>
                    {consumerResult.reasoning.analysisNotes && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8, marginBottom: 0, fontStyle: "italic" }}>{consumerResult.reasoning.analysisNotes}</p>
                    )}
                  </div>
                )}

                {/* Alternates */}
                {consumerResult.alternates.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={labelStyle}>Could Also Be</h3>
                    {consumerResult.alternates.map((a, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{a.confidence}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── QUALITY TAB ── */}
            {activeTab === "quality" && (
              <>
                {/* Grade Breakdown */}
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Quality Breakdown</h3>
                  {Object.entries(consumerResult.quality.breakdown).map(([key, val]) => {
                    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                    const pct = ((val as number) / 10) * 100;
                    return (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(consumerResult.quality.grade) }}>{val as number}/10</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                          <div style={{ height: "100%", borderRadius: 2, background: gradeColor(consumerResult.quality.grade), width: `${pct}%`, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trichome Maturity */}
                {consumerResult.morphology.trichomeMaturity && (
                  <div style={cardStyle}>
                    <h3 style={labelStyle}>Trichome Maturity</h3>
                    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                      {[
                        { label: "Clear", val: consumerResult.morphology.trichomeMaturity.clear, color: "#E0E0E0" },
                        { label: "Cloudy", val: consumerResult.morphology.trichomeMaturity.cloudy, color: "#FFF9C4" },
                        { label: "Amber", val: consumerResult.morphology.trichomeMaturity.amber, color: "#FFB74D" },
                      ].map((t) => (
                        <div key={t.label} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: t.color }}>{t.val}%</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{consumerResult.morphology.trichomes}</p>
                  </div>
                )}

                {/* Visual Traits */}
                {consumerResult.morphology.visualTraits.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={labelStyle}>Visual Traits</h3>
                    <div style={chipWrap}>
                      {consumerResult.morphology.visualTraits.map((t, i) => (
                        <span key={i} style={{ ...chipBase, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── SCIENCE TAB ── */}
            {activeTab === "science" && (
              <>
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Bud Structure</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{consumerResult.morphology.budStructure}</p>
                </div>
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Coloration</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{consumerResult.morphology.coloration}</p>
                </div>
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Pistils</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{consumerResult.morphology.pistils}</p>
                </div>
                {consumerResult.reasoning.conflictingSignals && consumerResult.reasoning.conflictingSignals.length > 0 && (
                  <div style={cardStyle}>
                    <h3 style={labelStyle}>Conflicting Signals</h3>
                    {consumerResult.reasoning.conflictingSignals.map((s, i) => (
                      <p key={i} style={{ fontSize: 13, color: "rgba(255,183,77,0.7)", margin: i === 0 ? 0 : "6px 0 0", lineHeight: 1.5 }}>⚠️ {s}</p>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── GROWING TAB ── */}
            {activeTab === "growing" && (
              <>
                <div style={cardStyle}>
                  <h3 style={labelStyle}>Cultivation Info</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Difficulty</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{consumerResult.cultivation.difficulty}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Flowering</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{consumerResult.cultivation.floweringTime}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Yield</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{consumerResult.cultivation.yield}</div>
                    </div>
                  </div>
                </div>
                {consumerResult.cultivation.growTips.length > 0 && (
                  <div style={cardStyle}>
                    <h3 style={labelStyle}>Grow Tips</h3>
                    {consumerResult.cultivation.growTips.map((tip, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ color: "#81C784", fontSize: 14 }}>💡</span>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>{tip}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── SAFETY TAB ── */}
            {activeTab === "safety" && (
              <>
                <div style={{ ...cardStyle, borderLeft: `3px solid ${safetyColor(consumerResult.problems.safetyVerdict)}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{safetyEmoji(consumerResult.problems.safetyVerdict)}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: safetyColor(consumerResult.problems.safetyVerdict) }}>{consumerResult.problems.safetyVerdict}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Safety Assessment</div>
                    </div>
                  </div>
                  {!consumerResult.problems.detected && (
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>No visible mold, pests, or contamination detected.</p>
                  )}
                </div>

                {consumerResult.problems.issues.length > 0 && (
                  <div>
                    {consumerResult.problems.issues.map((issue, i) => (
                      <div key={i} style={{ ...cardStyle, borderLeft: `3px solid ${issue.severity === "critical" ? "#F44336" : issue.severity === "high" ? "#FF9800" : "#FFC107"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{issue.type}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${issue.severity === "critical" ? "#F44336" : issue.severity === "high" ? "#FF9800" : "#FFC107"}22`, color: issue.severity === "critical" ? "#F44336" : issue.severity === "high" ? "#FF9800" : "#FFC107", textTransform: "uppercase" }}>{issue.severity}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 6px" }}>{issue.description}</p>
                        <p style={{ fontSize: 12, color: "#81C784", margin: 0 }}>→ {issue.action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Disclaimer */}
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 20 }}>
              AI-assisted visual analysis. Not a substitute for laboratory testing.
            </p>

            {/* Scan Again */}
            <div style={{ textAlign: "center", marginTop: 16, marginBottom: 20 }}>
              <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 50, padding: "14px 40px", color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Scan Again
              </button>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━ GROWER RESULTS ━━━━━━━━━━ */}
        {growerResult && scanState === "done" && (
          <div style={{ marginTop: 12 }}>
            {/* Hero: Health Score */}
            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: healthColor(growerResult.health.status), lineHeight: 1 }}>
                {growerResult.health.score}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: healthColor(growerResult.health.status), marginTop: 4 }}>
                {growerResult.health.status}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{growerResult.health.summary}</p>

              {growerResult.strainName !== "Unknown Cultivar" && (
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 6, fontStyle: "italic" }}>
                  Likely: {growerResult.strainName} ({growerResult.confidence}%)
                </p>
              )}
            </div>

            {/* Urgent Actions */}
            {growerResult.actionItems.urgent && growerResult.actionItems.urgent.length > 0 && (
              <div style={{ ...cardStyle, borderLeft: "3px solid #F44336", background: "rgba(244,67,54,0.06)" }}>
                <h3 style={{ ...labelStyle, color: "#F44336" }}>🚨 Urgent Actions</h3>
                {growerResult.actionItems.urgent.map((a, i) => (
                  <p key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: i === 0 ? 0 : "8px 0 0", lineHeight: 1.5 }}>• {a}</p>
                ))}
              </div>
            )}

            {/* Growth Stage */}
            <div style={cardStyle}>
              <h3 style={labelStyle}>Growth Stage</h3>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#81C784" }}>{growerResult.growthStage.stage}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Age</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{growerResult.growthStage.estimatedAge}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Harvest Window</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{growerResult.growthStage.harvestWindow}</div>
                </div>
              </div>
              {growerResult.growthStage.daysToHarvest !== null && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(76,175,80,0.1)" }}>
                  <span style={{ fontSize: 13, color: "#81C784", fontWeight: 600 }}>~{growerResult.growthStage.daysToHarvest} days to harvest</span>
                </div>
              )}
            </div>

            {/* Trichome Maturity */}
            {growerResult.trichomes.visible && (
              <div style={cardStyle}>
                <h3 style={labelStyle}>Trichome Maturity</h3>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  {[
                    { label: "Clear", val: growerResult.trichomes.maturity.clear, color: "#E0E0E0" },
                    { label: "Cloudy", val: growerResult.trichomes.maturity.cloudy, color: "#FFF9C4" },
                    { label: "Amber", val: growerResult.trichomes.maturity.amber, color: "#FFB74D" },
                  ].map((t) => (
                    <div key={t.label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: t.color }}>{t.val}%</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{t.label}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{growerResult.trichomes.assessment}</p>
              </div>
            )}

            {/* Problems */}
            <div style={{ ...cardStyle, borderLeft: `3px solid ${riskColor(growerResult.problems.overallRisk)}` }}>
              <h3 style={labelStyle}>Problems</h3>
              <div style={{ fontSize: 16, fontWeight: 700, color: riskColor(growerResult.problems.overallRisk), marginBottom: 8 }}>
                Risk: {growerResult.problems.overallRisk}
              </div>
              {!growerResult.problems.detected && (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>✅ No issues detected — looking good!</p>
              )}
              {growerResult.problems.issues.map((issue, i) => (
                <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{issue.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${riskColor(issue.severity)}22`, color: riskColor(issue.severity), textTransform: "uppercase" }}>{issue.severity}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "4px 0" }}>{issue.description}</p>
                  <p style={{ fontSize: 12, color: "#81C784", margin: 0 }}>→ {issue.immediateAction}</p>
                </div>
              ))}
            </div>

            {/* Nutrients */}
            <div style={cardStyle}>
              <h3 style={labelStyle}>Nutrient Status</h3>
              <div style={{ fontSize: 16, fontWeight: 700, color: growerResult.nutrients.status === "Optimal" ? "#4CAF50" : "#FFC107", marginBottom: 8 }}>
                {growerResult.nutrients.status}
              </div>
              {growerResult.nutrients.deficiencies.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {growerResult.nutrients.deficiencies.map((d, i) => (
                    <div key={i} style={{ padding: "6px 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{d.nutrient}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>({d.severity})</span>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>{d.signs}</p>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>💡 {growerResult.nutrients.feedingAdvice}</p>
            </div>

            {/* Environment */}
            <div style={cardStyle}>
              <h3 style={labelStyle}>Environment</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Grow Type</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{growerResult.environment.growType}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Morphotype</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{growerResult.genetics.dominance}</div>
                </div>
              </div>
              {growerResult.environment.lightAssessment && (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 10, marginBottom: 0 }}>{growerResult.environment.lightAssessment}</p>
              )}
            </div>

            {/* Recommended Actions */}
            {growerResult.actionItems.recommended.length > 0 && (
              <div style={cardStyle}>
                <h3 style={labelStyle}>Recommended Actions</h3>
                {growerResult.actionItems.recommended.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "#81C784" }}>→</span>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>{a}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Watch For */}
            {growerResult.actionItems.watchFor.length > 0 && (
              <div style={cardStyle}>
                <h3 style={labelStyle}>Watch For</h3>
                {growerResult.actionItems.watchFor.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#FFC107" }}>👁</span>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 20 }}>
              AI-assisted grow analysis. Not a substitute for professional cultivation advice.
            </p>

            {/* Scan Again */}
            <div style={{ textAlign: "center", marginTop: 16, marginBottom: 20 }}>
              <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 50, padding: "14px 40px", color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Scan Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
