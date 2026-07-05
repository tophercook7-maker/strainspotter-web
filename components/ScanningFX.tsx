"use client";

// ScanningFX — the cinematic scan moment shown over the user's actual photo
// while the AI analyzes it. Laser sweep, tech grid, reticle, sparkles, a HUD
// that cycles through honest stages, and a glowing progress bar.
//
// Inline styles + keyframes in globals.css (sfx-*). Drop-in overlay:
//   {scanState === "scanning" && <ScanningFX imageUrl={previews[0]} />}

import { useEffect, useState, type CSSProperties } from "react";

const DUAL_STAGES = [
  "🔍 Reading label & text…",
  "🩺 Estimating stage & age…",
  "🔍 Weighing trichomes & pistils…",
  "🩺 Scanning leaves for stress…",
  "🔍 Matching against 314 cultivars…",
  "🩺 Checking for deficiencies…",
  "Fusing both reads into one result…",
  "Calibrating honest confidence…",
];
const STRAIN_STAGES = [
  "🔍 Reading label & text…",
  "🔍 Weighing trichomes & pistils…",
  "🔍 Matching against 314 cultivars…",
  "🔍 Cross-checking visual traits…",
  "Calibrating honest confidence…",
];

const G = "#6ee7b7";

export default function ScanningFX({ imageUrl, dual = false }: { imageUrl?: string; dual?: boolean }) {
  const STAGES = dual ? DUAL_STAGES : STRAIN_STAGES;
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(0);
  // Two independent tracks filling in parallel — the visible proof that ONE
  // scan is reading both the strain and the plant's health at the same time.
  const [strainPct, setStrainPct] = useState(0);
  const [healthPct, setHealthPct] = useState(0);

  useEffect(() => {
    const a = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1400);
    const b = setInterval(() => setPct((p) => Math.min(100, p + Math.random() * 6)), 260);
    const c = setInterval(() => setStrainPct((p) => Math.min(100, p + Math.random() * 9)), 300);
    const d = setInterval(() => setHealthPct((p) => Math.min(100, p + Math.random() * 7)), 340);
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); clearInterval(d); };
  }, []);

  const corner = (pos: CSSProperties): CSSProperties => ({
    position: "absolute", width: 30, height: 30, border: `2px solid ${G}`,
    filter: "drop-shadow(0 0 6px rgba(52,211,153,0.7))", ...pos,
  });
  const spark = (l: string, t: string, d: string): CSSProperties => ({
    position: "absolute", left: l, top: t, width: 5, height: 5, borderRadius: "50%",
    background: "#bef264", boxShadow: "0 0 8px 2px rgba(163,230,53,0.9)",
    animation: `sfx-twinkle 1.8s ease-in-out infinite`, animationDelay: d,
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center",
      background: "rgba(4,8,5,0.82)", backdropFilter: "blur(6px)", padding: 24,
    }}>
      <div style={{ width: 360, maxWidth: "92vw" }}>
        <div style={{
          position: "relative", aspectRatio: "3 / 4", borderRadius: 22, overflow: "hidden",
          background: "#000", boxShadow: "0 30px 70px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(52,211,153,0.25)",
        }}>
          {imageUrl && (
            <img src={imageUrl} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", filter: "saturate(1.1) contrast(1.05)",
            }} />
          )}
          {/* moving grid */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.5,
            backgroundImage: "linear-gradient(rgba(52,211,153,0.14) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,0.14) 1px,transparent 1px)",
            backgroundSize: "28px 28px", animation: "sfx-drift 6s linear infinite",
          }} />
          {/* top HUD */}
          <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.12)", color: G, borderRadius: 99, padding: "3px 10px", fontWeight: 700, letterSpacing: 0.6 }}>◦ {dual ? "ONE SCAN · 2 READS" : "LIVE SCAN"}</span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{Math.round(pct)}%</span>
          </div>
          {/* reticle */}
          <div style={{ position: "absolute", inset: 20, pointerEvents: "none" }}>
            <span style={corner({ left: 0, top: 0, borderRight: "none", borderBottom: "none", animation: "sfx-pulse 1.6s ease-in-out infinite" })} />
            <span style={corner({ right: 0, top: 0, borderLeft: "none", borderBottom: "none", animation: "sfx-pulse 1.6s ease-in-out infinite" })} />
            <span style={corner({ left: 0, bottom: 0, borderRight: "none", borderTop: "none", animation: "sfx-pulse 1.6s ease-in-out infinite" })} />
            <span style={corner({ right: 0, bottom: 0, borderLeft: "none", borderTop: "none", animation: "sfx-pulse 1.6s ease-in-out infinite" })} />
          </div>
          {/* laser sweep */}
          <div style={{
            position: "absolute", left: 0, right: 0, height: 2, background: G,
            boxShadow: "0 0 22px 6px rgba(52,211,153,0.8)", animation: "sfx-sweep 2.4s cubic-bezier(.6,0,.4,1) infinite",
          }} />
          {/* sparkles */}
          <div style={spark("30%", "38%", "0s")} />
          <div style={spark("62%", "30%", "0.4s")} />
          <div style={spark("48%", "60%", "0.9s")} />
          <div style={spark("72%", "66%", "1.3s")} />
          {/* bottom HUD */}
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, textShadow: "0 1px 4px rgba(0,0,0,0.8)", marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: G, boxShadow: `0 0 8px ${G}`, animation: "sfx-pulse 1s infinite" }} />
              {STAGES[stage]}
            </div>
            {/* tracks — strain always; health rides along only when opted in */}
            {(dual
              ? [
                  { label: "🔍 STRAIN", pctv: strainPct, grad: "linear-gradient(90deg,#34d399,#a3e635)" },
                  { label: "🩺 HEALTH", pctv: healthPct, grad: "linear-gradient(90deg,#34d399,#6ee7b7)" },
                ]
              : [
                  { label: "🔍 STRAIN", pctv: pct, grad: "linear-gradient(90deg,#34d399,#a3e635)" },
                ]
            ).map((t) => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                <span style={{ width: 66, flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: 0.4, color: "rgba(255,255,255,0.82)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{t.label}</span>
                <div style={{ flex: 1, height: 7, borderRadius: 99, background: "rgba(255,255,255,0.12)", overflow: "hidden", boxShadow: "inset 0 0 6px rgba(0,0,0,0.5)" }}>
                  <span style={{ display: "block", height: "100%", width: `${t.pctv}%`, borderRadius: 99, background: t.grad, boxShadow: "0 0 12px rgba(52,211,153,0.75)", transition: "width 0.3s ease" }} />
                </div>
                <span style={{ width: 30, flexShrink: 0, textAlign: "right", fontSize: 10, color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>{Math.round(t.pctv)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
