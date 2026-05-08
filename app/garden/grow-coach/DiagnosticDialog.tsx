"use client";

// app/garden/grow-coach/DiagnosticDialog.tsx
//
// "Doctor's office" — photo + symptoms → AI plant-problem diagnosis.
// Self-contained modal: upload up to 4 images, optionally describe the
// problem, optionally tag stage/strain. Calls /api/grow-doctor/diagnose
// (subscription-gated) and renders ranked diagnoses with severity,
// immediate actions, and prevention guidance.

import { useState, useRef } from "react";

/* ─── try to use real auth, fall back gracefully ─── */
let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

type Stage =
  | "sourcing" | "seed" | "seedling" | "veg" | "flower"
  | "dry" | "cure" | "harvested" | "partake";

type Diagnosis = {
  cause: string;
  category: string;
  confidence: number;
  explanation: string;
  supportingObservations: string[];
};

type DiagnosisResponse = {
  schemaVersion: "grow-doctor-v1";
  imageAssessment: {
    isCannabisPlant: boolean;
    imageQuality: "clear" | "blurry" | "too-dark" | "too-far";
    stageObserved: "seedling" | "veg" | "flower" | "harvested" | "unclear";
    affectedArea: string;
  };
  diagnoses: Diagnosis[];
  severity: "low" | "moderate" | "urgent";
  severityReasoning: string;
  immediateActions: string[];
  monitor: string[];
  prevention: string[];
  advisoryNote: string | null;
  notCannabisMessage: string | null;
};

const STAGE_OPTIONS: { value: Stage | ""; label: string }[] = [
  { value: "", label: "Not sure / skip" },
  { value: "seedling", label: "Seedling" },
  { value: "veg", label: "Vegetative" },
  { value: "flower", label: "Flowering" },
  { value: "dry", label: "Drying" },
  { value: "cure", label: "Curing" },
];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Compress to ≤1024px on the long edge before uploading
async function compressImage(file: File, maxDim = 1024, quality = 0.85): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

const severityColor = {
  low: { bg: "rgba(76,175,80,0.10)", border: "rgba(76,175,80,0.35)", text: "#81C784", emoji: "🟢" },
  moderate: { bg: "rgba(255,183,77,0.10)", border: "rgba(255,183,77,0.35)", text: "#FFB74D", emoji: "🟡" },
  urgent: { bg: "rgba(244,67,54,0.10)", border: "rgba(244,67,54,0.35)", text: "#EF5350", emoji: "🔴" },
};

const categoryEmoji: Record<string, string> = {
  nutrient: "🧪",
  water: "💧",
  light: "☀️",
  pest: "🐛",
  disease: "🦠",
  environment: "🌡️",
  mechanical: "🛠️",
  genetic: "🧬",
  unknown: "❓",
};

export default function DiagnosticDialog({
  onClose,
  onSubscriptionRequired,
  initialStage,
  initialStrain,
}: {
  onClose: () => void;
  /** Optional: called when the server returns 401 or 402. Lets the
   *  parent open the paywall instead of showing a plain error. */
  onSubscriptionRequired?: () => void;
  initialStage?: Stage;
  initialStrain?: string;
}) {
  const auth = useOptionalAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage | "">(initialStage || "");
  const [strain, setStrain] = useState<string>(initialStrain || "");
  const [symptoms, setSymptoms] = useState<string>("");
  const [environment, setEnvironment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResponse | null>(null);

  const addFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    const incoming = Array.from(filesList).filter((f) => f.type.startsWith("image/"));
    const next = [...images, ...incoming].slice(0, 4);
    setImages(next);
    const urls = await Promise.all(next.map((f) => fileToDataUrl(f)));
    setPreviews(urls);
  };
  const removeAt = (i: number) => {
    setImages((arr) => arr.filter((_, idx) => idx !== i));
    setPreviews((arr) => arr.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      setError("Add at least one photo of the problem area.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const compressed = await Promise.all(images.map((f) => compressImage(f)));
      const authToken = auth?.session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const resp = await fetch("/api/grow-doctor/diagnose", {
        method: "POST",
        headers,
        body: JSON.stringify({
          images: compressed,
          stage: stage || undefined,
          strainName: strain.trim() || undefined,
          symptoms: symptoms.trim() || undefined,
          environment: environment.trim() || undefined,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        if (resp.status === 401 || resp.status === 402) {
          if (onSubscriptionRequired) {
            // Hand off to parent — they'll close us and pop the paywall.
            onSubscriptionRequired();
            return;
          }
          throw new Error(
            errBody?.error ||
              "Active subscription required for plant diagnostics. Open Settings to manage your plan."
          );
        }
        throw new Error(errBody?.error || `Server returned ${resp.status}`);
      }
      const data = (await resp.json()) as DiagnosisResponse;
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Diagnosis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages([]);
    setPreviews([]);
    setSymptoms("");
    setStrain(initialStrain || "");
    setStage(initialStage || "");
    setEnvironment("");
    setResult(null);
    setError(null);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)",
        zIndex: 999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 540,
          width: "100%",
          background: "linear-gradient(180deg, rgba(20,30,20,0.97), rgba(8,12,10,0.99))",
          border: "1px solid rgba(76,175,80,0.30)",
          borderRadius: 22,
          padding: "26px 22px 22px",
          color: "#fff",
          marginBottom: 32,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(76,175,80,0.25), rgba(46,125,50,0.40))",
            display: "grid", placeItems: "center", fontSize: 24,
          }}>🩺</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>
              Diagnose a Plant Problem
            </h2>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
              Photo &amp; details → AI cultivation analysis
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.78)", fontSize: 24,
              cursor: "pointer", lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* RESULT VIEW */}
        {result ? (
          <DiagnosisResult result={result} onReset={reset} onClose={onClose} />
        ) : (
          <>
            {/* Photos */}
            <div style={{ marginBottom: 16 }}>
              <Label>Photos of the problem (1–4)</Label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: 8, marginBottom: 8,
              }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: "relative", paddingTop: "100%", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                    <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={() => removeAt(i)}
                      aria-label="Remove image"
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 22, height: 22, borderRadius: "50%",
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1,
                      }}
                    >×</button>
                  </div>
                ))}
                {images.length < 4 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      paddingTop: "100%", position: "relative",
                      border: "1.5px dashed rgba(255,255,255,0.20)",
                      borderRadius: 10, background: "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{
                      position: "absolute", inset: 0,
                      display: "grid", placeItems: "center",
                      fontSize: 22, color: "rgba(255,255,255,0.72)",
                    }}>+</span>
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
              />
              <Hint>
                Take a close-up of the affected leaves or area. Good light helps a lot.
              </Hint>
            </div>

            {/* Stage */}
            <div style={{ marginBottom: 14 }}>
              <Label>Current stage (optional)</Label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage | "")}
                style={inputStyle}
              >
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Strain */}
            <div style={{ marginBottom: 14 }}>
              <Label>Strain (optional)</Label>
              <input
                type="text"
                value={strain}
                onChange={(e) => setStrain(e.target.value.slice(0, 80))}
                placeholder="e.g. Blue Dream"
                maxLength={80}
                style={inputStyle}
              />
            </div>

            {/* Symptoms */}
            <div style={{ marginBottom: 14 }}>
              <Label>What you&apos;re seeing (optional)</Label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value.slice(0, 500))}
                placeholder="Yellow spots on lower leaves the last 3 days, no new growth, fed nutes 2 days ago…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: 70, fontFamily: "inherit" }}
              />
              <Hint>{symptoms.length}/500 characters</Hint>
            </div>

            {/* Environment */}
            <div style={{ marginBottom: 18 }}>
              <Label>Environment (optional)</Label>
              <input
                type="text"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value.slice(0, 200))}
                placeholder="Indoor tent, 78°F, 55% RH, coco coir, Mars Hydro TS1000"
                maxLength={200}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 14,
                padding: "10px 12px", borderRadius: 10,
                background: "rgba(244,67,54,0.10)",
                border: "1px solid rgba(244,67,54,0.30)",
                color: "#EF5350", fontSize: 13,
              }}>{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || images.length === 0}
              style={{
                width: "100%",
                padding: "14px 0", borderRadius: 14,
                border: "none",
                background: loading || images.length === 0
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #43A047, #2E7D32)",
                color: loading || images.length === 0 ? "rgba(255,255,255,0.72)" : "#fff",
                fontSize: 15, fontWeight: 700, letterSpacing: 0.4,
                cursor: loading || images.length === 0 ? "not-allowed" : "pointer",
                boxShadow: loading || images.length === 0 ? "none" : "0 4px 18px rgba(46,125,50,0.35)",
              }}
            >
              {loading ? "Diagnosing…" : "Diagnose"}
            </button>

            <p style={{
              margin: "14px 0 0", fontSize: 13,
              color: "rgba(255,255,255,0.72)", lineHeight: 1.5, textAlign: "center",
            }}>
              AI-assisted plant-health analysis. For severe issues, also consult an experienced grower or your local agricultural extension service.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ──── Result display ──── */

function DiagnosisResult({
  result, onReset, onClose,
}: {
  result: DiagnosisResponse;
  onReset: () => void;
  onClose: () => void;
}) {
  // Not-cannabis short-circuit
  if (!result.imageAssessment.isCannabisPlant) {
    return (
      <div>
        <Banner color="warn" emoji="🤔" title="That doesn&rsquo;t look like a cannabis plant">
          {result.notCannabisMessage ||
            "We couldn't see a cannabis plant in the photo. Try a close, well-lit shot of the affected leaves or area on a cannabis plant."}
        </Banner>
        <FooterButtons onReset={onReset} onClose={onClose} resetLabel="Try Again" />
      </div>
    );
  }

  // Image quality short-circuit
  if (result.imageAssessment.imageQuality !== "clear" && result.diagnoses.length === 0) {
    return (
      <div>
        <Banner color="warn" emoji="📷" title="The photo is hard to read">
          The image is {result.imageAssessment.imageQuality.replace("-", " ")}. A close, well-lit shot of the affected leaves usually fixes this.
        </Banner>
        <FooterButtons onReset={onReset} onClose={onClose} resetLabel="Try Again" />
      </div>
    );
  }

  const sev = severityColor[result.severity];
  return (
    <div>
      {/* Severity strip */}
      <div style={{
        marginBottom: 16, padding: "10px 14px", borderRadius: 12,
        background: sev.bg, border: `1px solid ${sev.border}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>{sev.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: sev.text }}>
            {result.severity === "urgent" ? "Act Today" : result.severity === "moderate" ? "Act This Week" : "Monitor"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
            {result.severityReasoning}
          </div>
        </div>
      </div>

      {/* Diagnoses */}
      <SectionHeader>Most likely cause{result.diagnoses.length > 1 ? "s" : ""}</SectionHeader>
      {result.diagnoses.map((d, i) => (
        <div
          key={i}
          style={{
            marginBottom: 10, padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{categoryEmoji[d.category] || "❓"}</span>
            <strong style={{ flex: 1, fontSize: 15 }}>{d.cause}</strong>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "2px 8px",
              borderRadius: 99,
              background: d.confidence >= 70 ? "rgba(76,175,80,0.18)"
                       : d.confidence >= 40 ? "rgba(255,183,77,0.18)"
                       : "rgba(255,255,255,0.06)",
              color: d.confidence >= 70 ? "#81C784"
                   : d.confidence >= 40 ? "#FFB74D"
                   : "rgba(255,255,255,0.55)",
            }}>
              {d.confidence}%
            </span>
          </div>
          {d.explanation && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>
              {d.explanation}
            </p>
          )}
          {d.supportingObservations.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              {d.supportingObservations.map((o, j) => <li key={j}>{o}</li>)}
            </ul>
          )}
        </div>
      ))}

      {/* Immediate actions */}
      {result.immediateActions.length > 0 && (
        <>
          <SectionHeader>Do this today</SectionHeader>
          <ol style={{
            margin: 0, paddingLeft: 22, fontSize: 13,
            color: "rgba(255,255,255,0.85)", lineHeight: 1.7,
          }}>
            {result.immediateActions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
          </ol>
        </>
      )}

      {/* Monitor */}
      {result.monitor.length > 0 && (
        <>
          <SectionHeader>Watch for over the next 3-7 days</SectionHeader>
          <ul style={{
            margin: 0, paddingLeft: 22, fontSize: 13,
            color: "rgba(255,255,255,0.78)", lineHeight: 1.7,
          }}>
            {result.monitor.map((m, i) => <li key={i} style={{ marginBottom: 3 }}>{m}</li>)}
          </ul>
        </>
      )}

      {/* Prevention */}
      {result.prevention.length > 0 && (
        <>
          <SectionHeader>Prevent next grow</SectionHeader>
          <ul style={{
            margin: 0, paddingLeft: 22, fontSize: 13,
            color: "rgba(255,255,255,0.78)", lineHeight: 1.7,
          }}>
            {result.prevention.map((p, i) => <li key={i} style={{ marginBottom: 3 }}>{p}</li>)}
          </ul>
        </>
      )}

      {/* Advisory */}
      {result.advisoryNote && (
        <div style={{
          marginTop: 14, padding: "10px 12px", borderRadius: 10,
          background: "rgba(33,150,243,0.08)",
          border: "1px solid rgba(33,150,243,0.25)",
          fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.55,
        }}>
          ℹ️ {result.advisoryNote}
        </div>
      )}

      <FooterButtons onReset={onReset} onClose={onClose} resetLabel="Diagnose Another" />
    </div>
  );
}

/* ──── Small UI helpers ──── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, letterSpacing: 1.2,
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.55)", marginBottom: 6,
    }}>{children}</div>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
      {children}
    </div>
  );
}
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 18, marginBottom: 8,
      fontSize: 13, fontWeight: 700, letterSpacing: 1.2,
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.55)",
    }}>{children}</div>
  );
}
function Banner({
  color, emoji, title, children,
}: {
  color: "warn" | "info";
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  const palette = color === "warn"
    ? { bg: "rgba(255,183,77,0.10)", border: "rgba(255,183,77,0.35)", text: "#FFB74D" }
    : { bg: "rgba(33,150,243,0.10)", border: "rgba(33,150,243,0.35)", text: "#90CAF9" };
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 14,
      background: palette.bg, border: `1px solid ${palette.border}`,
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: palette.text, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
function FooterButtons({
  onReset, onClose, resetLabel,
}: {
  onReset: () => void;
  onClose: () => void;
  resetLabel: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
      <button
        onClick={onReset}
        style={{
          flex: 1, padding: "12px 0",
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}
      >{resetLabel}</button>
      <button
        onClick={onClose}
        style={{
          flex: 1, padding: "12px 0",
          borderRadius: 12, border: "none",
          background: "linear-gradient(135deg, #43A047, #2E7D32)",
          color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}
      >Done</button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.30)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};
