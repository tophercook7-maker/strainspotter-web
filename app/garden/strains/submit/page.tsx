"use client";

// app/garden/strains/submit/page.tsx
//
// Strain submission flow. Routed to from the scanner result page when
// the user wants to add a new strain to the database. Reads pending
// submission data from sessionStorage if present; otherwise the user
// fills in everything fresh.
//
// Server enforces: subscription gate, OCR-must-match, trust-weight
// derivation, dedupe, threshold-promotion. This page only handles the
// inputs and posting.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../../_components/TopNav";

let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

interface PendingSubmission {
  proposedName?: string;
  ocrText?: string;
  evidencePreview?: string | null;
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
};

export default function StrainSubmitPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [proposedName, setProposedName] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [proposedType, setProposedType] = useState<
    "Sativa" | "Indica" | "Hybrid" | "unknown"
  >("unknown");
  const [proposedLineage, setProposedLineage] = useState("");
  const [proposedNotes, setProposedNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    status: "pending" | "reviewing";
    cumulativeWeight: number;
    message: string;
  } | null>(null);

  /* ─── Hydrate from sessionStorage if scanner sent us a draft ─── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("ss_pending_submission");
      if (!raw) return;
      const draft = JSON.parse(raw) as PendingSubmission;
      if (draft.proposedName) setProposedName(draft.proposedName);
      if (draft.ocrText) setOcrText(draft.ocrText);
      if (draft.evidencePreview) setEvidencePreview(draft.evidencePreview);
      sessionStorage.removeItem("ss_pending_submission");
    } catch {
      /* best effort */
    }
  }, []);

  const handleFile = (file: File | null) => {
    setEvidenceFile(file);
    if (!file) {
      setEvidencePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEvidencePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError(null);

    if (proposedName.trim().length < 2) {
      setError("Strain name is required.");
      return;
    }
    if (!evidencePreview) {
      setError(
        "Photo evidence required — a label or jar showing the strain name."
      );
      return;
    }
    if (ocrText.trim().length < 3) {
      setError(
        "We need the label text. Type out what's printed on the jar / packet so we can verify it matches the strain name."
      );
      return;
    }

    const token = auth?.session?.access_token;
    if (!token) {
      setError("Please sign in again before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // For now we send the data URL as evidence_image_url. In v2.0 we'll
      // upload to Supabase Storage first and pass the public URL. The API
      // accepts http(s) only, so we'll need that bucket for production —
      // tracked in the migration roadmap.
      //
      // For TestFlight / staging the API can be relaxed to accept data
      // URLs; for now we pass it through and if the API rejects, the user
      // sees the precise error.
      const resp = await fetch("/api/strain-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          proposedName: proposedName.trim(),
          evidenceImageUrl: evidencePreview, // data URL for now
          ocrText: ocrText.trim(),
          proposedType,
          proposedLineage: proposedLineage.trim() || undefined,
          proposedNotes: proposedNotes.trim() || undefined,
        }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 402) {
          setError(
            data?.error ||
              "Active subscription required to submit strains."
          );
          return;
        }
        if (resp.status === 422 && data?.code === "ocr_no_match") {
          setError(
            "The label text doesn't contain the strain name. Type the label exactly as printed."
          );
          return;
        }
        if (resp.status === 409 && data?.code === "duplicate") {
          setError(
            "You've already submitted this strain. Each submitter counts once per strain."
          );
          return;
        }
        setError(data?.error || `Submission failed (${resp.status}).`);
        return;
      }

      setSuccess({
        status: data.status,
        cumulativeWeight: data.cumulativeWeight,
        message: data.message,
      });
    } catch (e: any) {
      setError(e?.message || "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Success ─── */
  if (success) {
    return (
      <>
        <TopNav title="Submission received" showBack />
        <main className="min-h-screen text-white">
          <div className="mx-auto w-full max-w-[640px] px-4 py-8">
            <div style={{ ...glass, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>🌱</div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  margin: "0 0 10px",
                  letterSpacing: -0.3,
                }}
              >
                {success.status === "reviewing"
                  ? "Threshold reached!"
                  : "Submission recorded"}
              </h1>
              <p
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 14,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {success.message}
              </p>
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(76,175,80,0.10)",
                  border: "1px solid rgba(76,175,80,0.20)",
                  display: "inline-block",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: "uppercase" as const,
                    color: "rgba(129,199,132,0.65)",
                    marginBottom: 4,
                  }}
                >
                  Evidence weight
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#A5D6A7",
                  }}
                >
                  {success.cumulativeWeight.toFixed(1)} / 3.0
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={() => router.push("/garden/scanner")}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 12,
                    border: "none",
                    background:
                      "linear-gradient(135deg, #43A047, #2E7D32)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Back to scanner
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  /* ─── Form ─── */
  return (
    <>
      <TopNav title="Submit a strain" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[640px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 22, marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>📝</span>
              <span style={{ fontWeight: 800, fontSize: 22 }}>
                Submit a strain
              </span>
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 13,
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              Help grow the StrainSpotter database. We need a photo
              showing the strain name on a label, jar, or seed packet —
              and the label text typed out so we can verify the name
              matches what&rsquo;s printed.
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.40)",
                fontSize: 11,
                lineHeight: 1.55,
                margin: "10px 0 0",
              }}
            >
              When 3 different verified subscribers submit matching
              evidence for the same strain, our team reviews and
              approves it. No single submission goes live unilaterally.
            </p>
          </div>

          {/* Form */}
          <div style={{ ...glass, padding: 22 }}>
            <Field label="Strain name *">
              <input
                type="text"
                value={proposedName}
                onChange={(e) =>
                  setProposedName(e.target.value.slice(0, 80))
                }
                placeholder="e.g. Wedding Cake"
                style={inputStyle}
              />
            </Field>

            <Field label="Photo evidence *">
              {evidencePreview ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={evidencePreview}
                    alt="Label evidence"
                    style={{
                      width: "100%",
                      maxHeight: 280,
                      objectFit: "contain" as const,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.30)",
                    }}
                  />
                  <button
                    onClick={() => {
                      setEvidenceFile(null);
                      setEvidencePreview(null);
                    }}
                    style={{
                      position: "absolute" as const,
                      top: 8,
                      right: 8,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.65)",
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%",
                    padding: "20px 16px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "2px dashed rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📷 Tap to add a label / jar / packet photo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  handleFile(e.target.files?.[0] || null)
                }
              />
            </Field>

            <Field label="Label text *">
              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value.slice(0, 1000))}
                placeholder='Type out exactly what is printed on the label, including the strain name. e.g. "Wedding Cake | Indoor | THC 24.3% | Lot #4421 | Lab: SC Labs"'
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical" as const,
                  minHeight: 100,
                  fontFamily: "inherit",
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 4,
                  textAlign: "right" as const,
                }}
              >
                {ocrText.length}/1000
              </div>
            </Field>

            <Field label="Type">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["Sativa", "Indica", "Hybrid", "unknown"] as const).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setProposedType(t)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 99,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        background:
                          proposedType === t
                            ? "rgba(76,175,80,0.15)"
                            : "rgba(255,255,255,0.04)",
                        border:
                          proposedType === t
                            ? "1px solid rgba(76,175,80,0.40)"
                            : "1px solid rgba(255,255,255,0.10)",
                        color:
                          proposedType === t
                            ? "#81C784"
                            : "rgba(255,255,255,0.75)",
                      }}
                    >
                      {t === "unknown" ? "Not sure" : t}
                    </button>
                  )
                )}
              </div>
            </Field>

            <Field label="Lineage (optional)">
              <input
                type="text"
                value={proposedLineage}
                onChange={(e) =>
                  setProposedLineage(e.target.value.slice(0, 120))
                }
                placeholder='e.g. "Triangle Kush × Animal Mints"'
                style={inputStyle}
              />
            </Field>

            <Field label="Notes (optional)">
              <textarea
                value={proposedNotes}
                onChange={(e) =>
                  setProposedNotes(e.target.value.slice(0, 500))
                }
                placeholder="Anything else our team should know — breeder, region, lab, what stood out, etc."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical" as const,
                  minHeight: 70,
                  fontFamily: "inherit",
                }}
              />
            </Field>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(244,67,54,0.10)",
                  border: "1px solid rgba(244,67,54,0.30)",
                  color: "#EF9A9A",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: submitting
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #43A047, #2E7D32)",
                color: submitting ? "rgba(255,255,255,0.45)" : "#fff",
                fontSize: 15,
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.55)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
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
