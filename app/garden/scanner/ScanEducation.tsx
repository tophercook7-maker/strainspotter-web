"use client";

// ScanEducation — the "worth it for the education alone" layer. All cost-free,
// rendered from data every scan already produces (+ static knowledge):
//   • Harvest school  — reads the trichome color into a harvest-window lesson
//   • Effects, explained — WHY you feel each reported effect
//   • Consumption 101 — methods, onset, and dosing basics
//
import { useState } from "react";
import { getEffectInfo } from "@/lib/education/effects";
import { interpretHarvest } from "@/lib/education/harvest";

const card: React.CSSProperties = {
  padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)", marginBottom: 14,
};
const heading: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
  color: "rgba(255,255,255,0.65)", marginBottom: 10,
};

export default function ScanEducation({
  effects, trichomes, coloration,
}: {
  effects: string[];
  trichomes?: string;
  coloration?: string;
}) {
  const harvest = interpretHarvest(trichomes, coloration);
  const explained = effects.map((e) => ({ raw: e, info: getEffectInfo(e) })).filter((x) => x.info);

  return (
    <>
      {/* Harvest school */}
      {harvest && (
        <div style={card}>
          <div style={heading}>🔬 Harvest school</div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>{harvest.emoji}</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#6ee7b7", marginBottom: 4 }}>{harvest.stage}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.5, marginBottom: 6 }}>{harvest.window}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                <strong style={{ color: "rgba(255,255,255,0.75)" }}>What it means: </strong>{harvest.effect}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 10, lineHeight: 1.5 }}>
            Trichome color is the grower&rsquo;s primary harvest signal — clear → cloudy → amber.
          </div>
        </div>
      )}

      {/* Effects, explained */}
      {explained.length > 0 && (
        <div style={card}>
          <div style={heading}>💡 Effects, explained</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {explained.map(({ info }, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{info!.emoji}</span>
                <div>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{info!.name}</span>
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", lineHeight: 1.5 }}> — {info!.why}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumption 101 */}
      <ConsumptionGuide />
    </>
  );
}

function ConsumptionGuide() {
  const [open, setOpen] = useState(false);
  const rows = [
    { m: "💨 Inhaled (flower/vape)", onset: "Onset 2–10 min · peak ~30 min · lasts 1–3 h", note: "Fastest feedback — easiest to titrate. Vaping at a terpene's boiling point brings out its character." },
    { m: "🍬 Edibles", onset: "Onset 30–90 min · peak ~2–4 h · lasts 4–8 h", note: "Liver converts THC to a stronger, longer form. The #1 rookie mistake is redosing before it hits." },
    { m: "💧 Tinctures (sublingual)", onset: "Onset 15–45 min · lasts 2–5 h", note: "Held under the tongue, it's a middle ground — faster than edibles, gentler than inhaling." },
  ];
  return (
    <div style={card}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <span style={heading as React.CSSProperties}>🎓 Consumption 101</span>
        <span style={{ color: "#6ee7b7", fontSize: 13, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
      </button>
      <div style={{
        marginTop: open ? 6 : 0, padding: "12px 14px", borderRadius: 12,
        background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.18)",
        display: open ? "block" : "none",
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#6ee7b7", marginBottom: 8 }}>Start low, go slow.</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.5, marginBottom: 12 }}>
          Everyone&rsquo;s tolerance differs. Take one step, wait for the full onset below before deciding to take more — especially with edibles.
        </div>
        {rows.map((r) => (
          <div key={r.m} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.m}</div>
            <div style={{ fontSize: 11.5, color: "#a3e635", margin: "2px 0 2px" }}>{r.onset}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{r.note}</div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, lineHeight: 1.5 }}>
          Educational only. Follow your local laws; never drive impaired.
        </div>
      </div>
      {!open && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
          Methods, onset times &amp; dosing basics — tap to open.
        </div>
      )}
    </div>
  );
}
