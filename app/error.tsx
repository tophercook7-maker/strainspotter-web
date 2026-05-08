"use client";

// app/error.tsx
//
// Next.js automatically renders this when an uncaught error happens
// inside any (route group) under app/ — for client components, server
// components, or async data fetching. Replaces the default 'Application
// error: a server-side exception has occurred' message with something
// human, on-brand, and actionable.

import { useEffect } from "react";
import Link from "next/link";

export default function GardenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to whatever telemetry we wire up later
    console.error("[StrainSpotter error boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>🌿</div>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          margin: "0 0 10px",
          letterSpacing: -0.4,
        }}
      >
        Something went sideways
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.55)",
          fontSize: 14,
          lineHeight: 1.6,
          margin: "0 0 22px",
          maxWidth: 360,
        }}
      >
        We hit an unexpected error. Most of the time, trying again clears
        it. If it keeps happening, please let us know what you were doing.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        <button
          onClick={() => reset()}
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #43A047, #2E7D32)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/garden"
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to Garden
        </Link>
      </div>

      {error?.digest && (
        <p
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 11,
            margin: 0,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
