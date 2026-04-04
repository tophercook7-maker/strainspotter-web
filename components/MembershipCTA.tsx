"use client";

import { getScansRemaining, FREE_SCAN_TOTAL, MEMBERSHIP_TIERS } from "@/lib/scanGating";
import { useEffect, useState } from "react";

interface MembershipCTAProps {
  variant?: "banner" | "inline" | "scanner-status";
}

export default function MembershipCTA({ variant = "banner" }: MembershipCTAProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(getScansRemaining());
  }, []);

  if (remaining === null) return null;

  if (variant === "scanner-status") {
    const pct = (remaining / FREE_SCAN_TOTAL) * 100;
    const barColor = remaining <= 1 ? "#EF5350" : remaining <= 2 ? "#FFB74D" : "#66BB6A";
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "12px 16px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Free Scans
          </span>
          <span style={{ color: barColor, fontSize: "13px", fontWeight: 700 }}>
            {remaining} / {FREE_SCAN_TOTAL}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "4px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: barColor,
              borderRadius: "99px",
              transition: "width 0.3s",
            }}
          />
        </div>
        {remaining <= 2 && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "6px" }}>
            {remaining === 0
              ? "Join to keep scanning →"
              : `${remaining === 1 ? "Last scan!" : "Running low."} Upgrade for 100+ scans/mo →`}
          </p>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, rgba(76,175,80,0.08), rgba(76,175,80,0.02))",
          border: "1px solid rgba(76,175,80,0.15)",
          borderRadius: "16px",
          padding: "16px",
          margin: "16px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "20px" }}>⭐</span>
          <span style={{ color: "#66BB6A", fontSize: "14px", fontWeight: 700 }}>
            Unlock Everything with Membership
          </span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1.6, margin: "0 0 10px" }}>
          Get unlimited access to AI scanning, grow coaching, dispensary finder, strain ecosystem, and more — starting at just {MEMBERSHIP_TIERS.member.price}.
        </p>
        <button
          style={{
            background: "rgba(76,175,80,0.15)",
            border: "1px solid rgba(76,175,80,0.3)",
            borderRadius: "10px",
            padding: "8px 16px",
            color: "#66BB6A",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          View Plans →
        </button>
      </div>
    );
  }

  // Default banner variant — shown on home page
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(76,175,80,0.1), rgba(255,215,0,0.05))",
        border: "1px solid rgba(76,175,80,0.2)",
        borderRadius: "18px",
        padding: "20px",
        margin: "0 0 20px",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#66BB6A", fontSize: "13px", fontWeight: 700, margin: "0 0 4px" }}>
        🌿 Become a StrainSpotter Member
      </p>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1.5, margin: "0 0 12px" }}>
        AI strain scanning, grow coaching, dispensary finder, and more — all unlimited from {MEMBERSHIP_TIERS.member.price}.
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
        {["📷 100 Scans/mo", "🌱 Grow Coach", "📍 Dispensaries", "🧬 Ecosystem"].map((tag) => (
          <span
            key={tag}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "99px",
              padding: "4px 10px",
              fontSize: "10px",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
