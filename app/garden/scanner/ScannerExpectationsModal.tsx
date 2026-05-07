"use client";

// app/garden/scanner/ScannerExpectationsModal.tsx
//
// Shown once per device on first scanner visit. Sets honest expectations
// so users know the tool works best with labels and that "candidates with
// 30-50% confidence" is a real answer — not a system failure.

import { useEffect, useState } from "react";

const STORAGE_KEY = "strainspotter:scanner-expectations-seen";

export function hasSeenScannerExpectations(): boolean {
  if (typeof window === "undefined") return true; // SSR — don't render modal
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* localStorage unavailable — fail silent */
  }
}

export default function ScannerExpectationsModal({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  // Only render after mount so SSR/CSR markup matches
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const handleDismiss = () => {
    markSeen();
    onDismiss();
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 440,
          width: "100%",
          background: "linear-gradient(180deg, rgba(20,30,20,0.96), rgba(10,15,10,0.98))",
          border: "1px solid rgba(76,175,80,0.25)",
          borderRadius: 20,
          padding: "28px 24px",
          color: "#fff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔍</div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            How Scan &amp; Analyze works
          </h2>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.82)" }}>
          <p style={{ margin: "0 0 14px" }}>
            We use AI vision to read your image and analyze what we see. Our
            results are most accurate when you photograph:
          </p>

          <ul style={{ margin: "0 0 16px", paddingLeft: 0, listStyle: "none" }}>
            <Item emoji="🏷️" title="Dispensary jar labels" body="Strain name printed → high confidence" />
            <Item emoji="📦" title="Packaging or seed packets" body="Same — readable text wins" />
            <Item emoji="🌸" title="Bud / flower close-ups" body="Trait analysis + best-guess candidates" />
          </ul>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255,183,77,0.08)",
              border: "1px solid rgba(255,183,77,0.25)",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB74D", marginBottom: 4, letterSpacing: 0.5 }}>
              ⚠️ HONEST LIMITATION
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.82)" }}>
              No AI — and no human expert — can reliably name a specific strain
              from an unlabeled bud photo alone. Two plants of the same strain
              from different growers can look more different than two completely
              different strains. When you don&apos;t have a label, we return
              several plausible candidates with honest 30–50% confidence rather
              than picking one and pretending we&apos;re sure.
            </div>
          </div>

          <p style={{ margin: "0 0 4px", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
            <strong style={{ color: "#fff" }}>Tip:</strong> If a seller or
            dispensary told you what the strain is, tap the &ldquo;Tell us what
            the seller called this&rdquo; field — we&apos;ll check the visual
            evidence against their claim.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            width: "100%",
            marginTop: 22,
            padding: "14px 0",
            borderRadius: 50,
            border: "none",
            background: "linear-gradient(135deg, #43A047, #2E7D32)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 0.4,
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(46,125,50,0.35)",
          }}
        >
          Got it — let&apos;s scan
        </button>
      </div>
    </div>
  );
}

function Item({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <li style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
          {body}
        </div>
      </div>
    </li>
  );
}
