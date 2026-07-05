"use client";

// InteractiveScannerHero — a live demo of the StrainSpotter scan on the landing
// page. A reticle sweeps the bud, then HONEST analysis animates in (calibrated
// candidates, no inflated floor). "Scan your own" → the real scanner.
//
// Self-contained: inline styles (the site's Tailwind v4 setup doesn't reliably
// JIT new utility classes) + keyframes in globals.css (ss-scanline / ss-fadeup).

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";

type Phase = "scanning" | "analyzing" | "results";

const CANDIDATES = [
  { name: "Blue Dream", conf: 84, color: "#34d399" },
  { name: "Super Silver Haze", conf: 57, color: "#a3e635" },
  { name: "OG Kush", conf: 33, color: "#fbbf24" },
];
const TRAITS = [
  ["Trichomes", "Dense · mostly cloudy"],
  ["Pistils", "Amber / burnt orange"],
  ["Terpenes", "Myrcene · Limonene"],
];

const s: Record<string, CSSProperties> = {
  section: {
    position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden",
    background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "64px 20px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  glow: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(60% 50% at 50% 22%, rgba(52,211,153,0.13), transparent)",
  },
  grid: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 1040,
    display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", justifyContent: "center",
  },
  copy: { flex: "1 1 320px", minWidth: 300, maxWidth: 460 },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)",
    padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#6ee7b7", marginBottom: 14,
  },
  dot: { height: 6, width: 6, borderRadius: 999, background: "#34d399", display: "inline-block" },
  h1: { fontSize: 46, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 },
  sub: { marginTop: 16, fontSize: 16, lineHeight: 1.5, color: "rgba(255,255,255,0.72)" },
  ctaRow: { marginTop: 26, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" },
  cta: {
    borderRadius: 12, background: "#34d399", padding: "13px 22px", fontSize: 14,
    fontWeight: 600, color: "#0a0a0a", textDecoration: "none",
  },
  replay: {
    borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "transparent",
    padding: "13px 18px", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.8)", cursor: "pointer",
  },
  fine: { marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" },
  phoneWrap: { flex: "0 0 auto" },
  phone: {
    position: "relative", width: 320, aspectRatio: "9 / 16", overflow: "hidden",
    borderRadius: 28, border: "1px solid rgba(255,255,255,0.1)", background: "#000",
    boxShadow: "0 30px 60px -20px rgba(0,0,0,0.8)",
  },
  video: { position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover" },
  vignette: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent 45%, rgba(0,0,0,0.3))",
  },
  status: {
    position: "absolute", left: "50%", top: 18, transform: "translateX(-50%)",
    borderRadius: 999, background: "rgba(0,0,0,0.6)", padding: "5px 12px",
    fontSize: 11, fontWeight: 500, backdropFilter: "blur(6px)",
  },
  panel: {
    position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)", padding: 14,
  },
  panelHead: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  panelLbl: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" },
  candRow: { marginBottom: 8 },
  candTop: { display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 },
  bar: { height: 6, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" },
  chipRow: { marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 6, background: "rgba(255,255,255,0.08)", padding: "4px 8px",
    fontSize: 11, color: "rgba(255,255,255,0.72)",
  },
};

const reticleCorner = (pos: CSSProperties): CSSProperties => ({
  position: "absolute", height: 26, width: 26, borderColor: "rgba(110,231,183,0.85)", ...pos,
});

export default function InteractiveScannerHero() {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setPhase("scanning");
    const t1 = setTimeout(() => setPhase("analyzing"), 2100);
    const t2 = setTimeout(() => setPhase("results"), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [runId]);

  return (
    <section style={s.section}>
      <div style={s.glow} />
      <div style={s.grid}>
        {/* copy */}
        <div style={s.copy}>
          <span style={s.pill}><span style={s.dot} /> Honest AI · calibrated confidence</span>
          <h1 style={s.h1}>Know what you&rsquo;re<br />really looking at.</h1>
          <p style={s.sub}>
            Point your camera at any bud or label. StrainSpotter reads it, weighs the visual
            evidence, and gives you an <span style={{ color: "#fff" }}>honest</span> answer —
            not a confident guess.
          </p>
          <div style={s.ctaRow}>
            <Link href="/garden/scanner" style={s.cta}>Scan your own bud →</Link>
            <button style={s.replay} onClick={() => setRunId((n) => n + 1)}>↻ Replay scan</button>
          </div>
          <p style={s.fine}>
            Works best with a label. Unlabeled bud → multiple honest candidates, never a fake single match.
          </p>
        </div>

        {/* scan window */}
        <div style={s.phoneWrap}>
          <div style={s.phone}>
            <video key={runId} style={s.video} src="/videos/strain_bud.mp4"
                   poster="/videos/strain_bud.jpg" autoPlay muted loop playsInline />
            <div style={s.vignette} />

            {/* reticle */}
            <div style={{ position: "absolute", inset: 24, pointerEvents: "none" }}>
              <span style={reticleCorner({ left: 0, top: 0, borderLeft: "2px solid", borderTop: "2px solid" })} />
              <span style={reticleCorner({ right: 0, top: 0, borderRight: "2px solid", borderTop: "2px solid" })} />
              <span style={reticleCorner({ left: 0, bottom: 0, borderLeft: "2px solid", borderBottom: "2px solid" })} />
              <span style={reticleCorner({ right: 0, bottom: 0, borderRight: "2px solid", borderBottom: "2px solid" })} />
            </div>

            {/* scan line */}
            {phase === "scanning" && (
              <div key={runId} className="ss-scanline"
                   style={{ position: "absolute", left: 0, right: 0, height: 3, background: "#6ee7b7",
                            boxShadow: "0 0 18px 4px rgba(52,211,153,0.7)" }} />
            )}

            {/* status */}
            <div style={s.status}>
              {phase === "scanning" && <span style={{ color: "#6ee7b7" }}>◦ Scanning…</span>}
              {phase === "analyzing" && <span style={{ color: "#bef264" }}>◦ Weighing evidence…</span>}
              {phase === "results" && <span style={{ color: "rgba(255,255,255,0.85)" }}>✓ Honest analysis</span>}
            </div>

            {/* results */}
            {phase === "results" && (
              <div className="ss-fadeup" style={s.panel}>
                <div style={s.panelHead}>
                  <span style={s.panelLbl}>Top candidates</span>
                  <span style={{ fontSize: 11, color: "#6ee7b7" }}>calibrated · no floor</span>
                </div>
                {CANDIDATES.map((c) => (
                  <div key={c.name} style={s.candRow}>
                    <div style={s.candTop}>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>{c.conf}%</span>
                    </div>
                    <div style={s.bar}>
                      <span style={{ display: "block", height: "100%", borderRadius: 999,
                                     width: `${c.conf}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
                <div style={s.chipRow}>
                  {TRAITS.map(([k, v]) => (
                    <span key={k} style={s.chip}>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{k}:</span> {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
