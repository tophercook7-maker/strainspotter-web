"use client";

// CoaPanel — REAL lab numbers pulled from the package's printed panel / COA.
// Renders only when parseCoa finds measured values, and is styled distinctly
// (a "measured" badge) so users never confuse it with the model's typical guess.
// Terpene rows are tappable into the same education KB.

import { useState } from "react";
import { parseCoa } from "@/lib/scanner/coaParser";
import { getTerpeneInfo } from "@/lib/education/terpenes";

export default function CoaPanel({ ocrText }: { ocrText?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const coa = parseCoa(ocrText);
  if (!coa) return null;

  const maxTerp = Math.max(0.001, ...coa.terpenes.map((t) => t.pct));

  return (
    <div style={{
      marginBottom: 14, borderRadius: 16, overflow: "hidden",
      background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.30)",
    }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(52,211,153,0.16)" }}>
        <span style={{ fontSize: 18 }}>🧾</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#6ee7b7" }}>Measured from the label</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Real lab numbers read off this package — not a guess</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#04120b", background: "#34d399", borderRadius: 6, padding: "3px 7px" }}>✓ LAB</span>
      </div>

      <div style={{ padding: 14 }}>
        {/* Cannabinoids */}
        {coa.cannabinoids.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: coa.terpenes.length ? 14 : 0 }}>
            {coa.cannabinoids.map((c) => (
              <div key={c.name} style={{
                padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", minWidth: 78,
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{c.pct}%</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>{c.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Terpenes — measured %, tappable education */}
        {coa.terpenes.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Terpene panel</span>
              {coa.totalTerpenes != null && (
                <span style={{ fontSize: 11.5, color: "#a3e635", fontWeight: 700 }}>Total {coa.totalTerpenes}%</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {coa.terpenes.map((t) => {
                const info = getTerpeneInfo(t.name);
                const isOpen = open === t.name;
                const w = Math.round((t.pct / maxTerp) * 100);
                return (
                  <div key={t.name}>
                    <button
                      onClick={() => info && setOpen(isOpen ? null : t.name)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 0,
                        background: "none", border: "none", cursor: info ? "pointer" : "default", textAlign: "left",
                      }}
                    >
                      <span style={{ width: 20, flexShrink: 0, fontSize: 15 }}>{info?.emoji ?? "🌿"}</span>
                      <span style={{ width: 104, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{info?.name ?? t.name}</span>
                      <span style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${w}%`, borderRadius: 99, background: "linear-gradient(90deg,#34d399,#a3e635)" }} />
                      </span>
                      <span style={{ width: 44, flexShrink: 0, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums" }}>{t.pct}%</span>
                    </button>
                    {isOpen && info && (
                      <div style={{ margin: "6px 0 4px 30px", fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                        <strong style={{ color: "rgba(255,255,255,0.8)" }}>{info.aroma}.</strong> {info.effects}. {info.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
