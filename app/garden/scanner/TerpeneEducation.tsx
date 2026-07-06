"use client";

// TerpeneEducation — turns a scan's bare terpene names into rich, tappable
// education cards (aroma, effects, benefits, vape temp, where else it's found).
// Known terpenes expand; unknown ones stay as simple chips. Zero API cost.

import { useState } from "react";
import { getTerpeneInfo } from "@/lib/education/terpenes";

export default function TerpeneEducation({ terpenes }: { terpenes: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const known = terpenes.map((t) => ({ raw: t, info: getTerpeneInfo(t) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {known.map(({ raw, info }, i) => {
        if (!info) {
          return (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
            }}>{raw}</div>
          );
        }
        const isOpen = open === info.name;
        return (
          <div key={i} style={{
            borderRadius: 14, overflow: "hidden",
            background: isOpen ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isOpen ? "rgba(52,211,153,0.28)" : "rgba(255,255,255,0.08)"}`,
            transition: "background 0.2s, border-color 0.2s",
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : info.name)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 14px",
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{info.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#fff" }}>{info.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{info.aroma}</div>
              </div>
              <span style={{
                flexShrink: 0, color: "#6ee7b7", fontSize: 13, transform: isOpen ? "rotate(90deg)" : "none",
                transition: "transform 0.2s",
              }}>›</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 14px 14px 47px", display: "flex", flexDirection: "column", gap: 9 }}>
                <Row label="Effect" value={info.effects} />
                <Row label="Associated with" value={info.benefits} />
                <Row label="Also found in" value={info.alsoFoundIn} />
                <Row label="Vape temp" value={`${info.boilC}°C / ${info.boilF}°F (its boiling point)`} />
                <div style={{
                  marginTop: 2, padding: "9px 12px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.5,
                  background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.16)",
                  color: "rgba(255,255,255,0.75)",
                }}>💡 {info.note}</div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, marginTop: 2 }}>
        Educational only — terpene effects are areas of active research, not medical advice.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
      <span style={{ flexShrink: 0, width: 96, color: "rgba(255,255,255,0.42)", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "rgba(255,255,255,0.8)" }}>{value}</span>
    </div>
  );
}
