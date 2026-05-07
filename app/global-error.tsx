"use client";

// app/global-error.tsx
//
// Last-resort error boundary that wraps the ENTIRE app, including the
// root layout. Renders only when an error happens before app/error.tsx
// can catch it (e.g. inside the root layout itself). It must define its
// own <html> and <body> tags because it's replacing the root layout.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[StrainSpotter global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
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
          Something broke at the root
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
          A serious error stopped the app from loading. Refresh to try
          again. If this keeps happening, please let us know.
        </p>
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
          Reload
        </button>
        {error?.digest && (
          <p
            style={{
              marginTop: 22,
              color: "rgba(255,255,255,0.30)",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
