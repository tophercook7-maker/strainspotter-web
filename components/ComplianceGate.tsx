"use client";

// ComplianceGate — wraps a policy-sensitive page. On web it's a pass-through
// (renders children unchanged); in a native-store build where the feature is
// disabled, it renders a neutral "open on the web" fallback instead, so the
// same codebase ships to Apple/Google without the restricted surface.

import Link from "next/link";
import { compliance, type ComplianceFeature } from "@/lib/storeCompliance";

export default function ComplianceGate({
  feature,
  title,
  children,
}: {
  feature: ComplianceFeature;
  title?: string;
  children: React.ReactNode;
}) {
  if (compliance[feature]) return <>{children}</>;

  return (
    <div style={{
      minHeight: "70vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, display: "grid", placeItems: "center", marginBottom: 18,
        background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", fontSize: 32,
      }}>🌐</div>
      <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
        {title ? `${title} lives on the web` : "Available on the web"}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: "0 0 22px" }}>
        This part of StrainSpotter isn&rsquo;t available in the app. Open it in your browser at
        strainspotter.app — everything syncs to your account.
      </p>
      <a
        href="https://www.strainspotter.app/garden"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 14,
          background: "linear-gradient(135deg, #34d399, #059669)", color: "#04120b",
          fontWeight: 800, fontSize: 14.5, textDecoration: "none",
        }}
      >
        Open on the web →
      </a>
      <Link href="/garden/scanner" style={{ marginTop: 14, color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none" }}>
        ← Back to Scanner
      </Link>
    </div>
  );
}
