"use client";

// ScanningFX — the cinematic scan moment shown over the user's actual photo
// while the AI analyzes it. Laser sweep, tech grid, reticle, sparkles, a HUD
// that cycles through honest stages, and a glowing progress bar.
//
// Inline styles + keyframes in globals.css (sfx-*). Drop-in overlay:
//   {scanState === "scanning" && <ScanningFX imageUrl={previews[0]} />}

import { useEffect, useState, type CSSProperties } from "react";

const STAGES = [
  "Reading label & text…",
  "Weighing trichomes & pistils…",
  "Matching against 314 cultivars…",
  "Checking plant health…",
  "Calibrating honest confidence…",
];

const G = "#6ee7b7";

export default function ScanningFX({ imageUrl }: { imageUrl?: string }) {
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const a = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1600);
    const b = setInterval(() => setPct((p) => Math.min(100, p + Math.random() * 6)), 260);
    return () => { clearInterval(a); clearInterval(b); };
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
            <span style={{ border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.12)", color: G, borderRadius: 99, padding: "3px 10px", fontWeight: 600 }}>◦ LIVE SCAN</span>
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
            <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: G, boxShadow: `0 0 8px ${G}`, animation: "sfx-pulse 1s infinite" }} />
              {STAGES[stage]}
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.12)", overflow: "hidden", marginTop: 8, boxShadow: "inset 0 0 6px rgba(0,0,0,0.5)" }}>
              <span style={{ display: "block", height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg,#34d399,#a3e635)", boxShadow: "0 0 14px rgba(52,211,153,0.8)", transition: "width 0.3s ease" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
