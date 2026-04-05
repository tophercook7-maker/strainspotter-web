"use client";

import { useState, useRef, useCallback } from "react";
import { orchestrateScan } from "@/lib/scanner/scanOrchestrator";
import Link from "next/link";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   StrainSpotter Scanner — Clean Visual Redesign
   Premium mobile-first cannabis scanner UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type ScanState = "idle" | "ready" | "scanning" | "done";

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
}

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

export default function ScannerPage() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<SimpleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 5;

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArr.length === 0) return;

    setImages(prev => {
      const next = [...prev, ...fileArr].slice(0, MAX_IMAGES);
      // Generate previews
      const urls = next.map(f => URL.createObjectURL(f));
      setPreviews(urls);
      return next;
    });
    setResult(null);
    setError(null);
    setScanState("ready");
  }, []);

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setPreviews(next.map(f => URL.createObjectURL(f)));
      if (next.length === 0) setScanState("idle");
      return next;
    });
    setResult(null);
  };

  const clearAll = () => {
    setImages([]);
    setPreviews([]);
    setResult(null);
    setError(null);
    setScanState("idle");
  };

  const handleScan = async () => {
    if (images.length === 0 || scanState === "scanning") return;
    setScanState("scanning");
    setError(null);

    try {
      const orchestrated = await orchestrateScan(images);
      const vm = orchestrated.rawScannerResult;

      const simple: SimpleResult = {
        strainName: vm.nameFirstDisplay?.primaryStrainName || vm.name || "Unknown",
        confidence: vm.confidence || 0,
        confidenceLabel: mapConfidence(vm.confidence || 0),
        type: (vm.genetics?.dominance as any) || "Hybrid",
        lineage: vm.genetics?.lineage || "",
        effects: [...(vm.effectsShort || []), ...(vm.effectsLong || [])].filter(Boolean).slice(0, 6),
        terpenes: (vm.terpeneGuess || []).slice(0, 4),
        description: vm.visualMatchSummary || vm.aiWikiBlend || "",
        tips: (vm.accuracyTips || []).slice(0, 3),
        alternates: (vm.nameFirstDisplay as any)?.alternateMatches?.slice(0, 3).map((a: any) => ({
          name: a.name || a.strainName,
          confidence: a.confidence || 0,
        })) || [],
      };

      setResult(simple);
      setScanState("done");
    } catch (e) {
      console.error("Scan error:", e);
      setError("Couldn't analyze the image. Try a clearer photo.");
      setScanState("ready");
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
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: "0 20px 100px", maxWidth: 480, margin: "0 auto" }}>

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
                  fontSize: 56,
                  animation: "leafSpin 3s ease-in-out infinite",
                  marginBottom: 16,
                }}>🍃</div>
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
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }}
        />

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
            {/* Strain Name Hero */}
            <div style={{
              textAlign: "center",
              padding: "32px 0 20px",
            }}>
              <span style={{ fontSize: 40 }}>{typeEmoji(result.type)}</span>
              <h1 style={{
                fontSize: 32,
                fontWeight: 800,
                margin: "12px 0 0",
                letterSpacing: -0.5,
                lineHeight: 1.1,
              }}>
                {result.strainName}
              </h1>

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
                  {result.confidenceLabel}
                </span>
              </div>

              {result.lineage && (
                <p style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 13,
                  marginTop: 12,
                  fontStyle: "italic",
                }}>
                  {result.lineage}
                </p>
              )}
            </div>

            {/* AI Summary */}
            {result.description && (
              <div style={{
                padding: "16px 18px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                marginBottom: 16,
              }}>
                <p style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                }}>
                  {result.description}
                </p>
              </div>
            )}

            {/* Effects */}
            {result.effects.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 10,
                }}>
                  Effects
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.effects.map((e, i) => (
                    <span key={i} style={{
                      padding: "8px 16px",
                      borderRadius: 24,
                      fontSize: 13,
                      fontWeight: 600,
                      background: "rgba(76,175,80,0.12)",
                      color: "rgba(129,199,132,0.9)",
                    }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Terpenes */}
            {result.terpenes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 10,
                }}>
                  Terpenes
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.terpenes.map((t, i) => {
                    const colors = [
                      { bg: "rgba(171,71,188,0.12)", text: "rgba(206,147,216,0.9)" },
                      { bg: "rgba(255,183,77,0.12)", text: "rgba(255,213,79,0.9)" },
                      { bg: "rgba(79,195,247,0.12)", text: "rgba(129,212,250,0.9)" },
                      { bg: "rgba(255,138,101,0.12)", text: "rgba(255,171,145,0.9)" },
                    ];
                    const c = colors[i % colors.length];
                    return (
                      <span key={i} style={{
                        padding: "8px 16px",
                        borderRadius: 24,
                        fontSize: 13,
                        fontWeight: 600,
                        background: c.bg,
                        color: c.text,
                      }}>
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alternate Matches */}
            {result.alternates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 10,
                }}>
                  Could Also Be
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.alternates.map((a, i) => (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                    }}>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{a.name}</span>
                      <span style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        fontWeight: 600,
                      }}>
                        {mapConfidence(a.confidence)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {result.tips.length > 0 && (
              <div style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                marginBottom: 16,
              }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  marginBottom: 8,
                }}>
                  Better Results
                </h3>
                {result.tips.map((tip, i) => (
                  <p key={i} style={{
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.4)",
                    margin: "4px 0",
                  }}>
                    💡 {tip}
                  </p>
                ))}
              </div>
            )}

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
              marginBottom: 20,
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
    </div>
  );
}
