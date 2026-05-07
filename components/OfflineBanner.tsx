"use client";

// components/OfflineBanner.tsx
//
// Shows a non-dismissible banner at the top of the app whenever the
// browser reports we are offline. The scanner and Grow Doctor diagnostic
// both require network access to call OpenAI; this saves users from
// tapping Scan five times before realizing what's wrong.

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        padding: "10px 16px",
        background: "rgba(244,67,54,0.95)",
        color: "#fff",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.2,
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.30)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      ⚠️ You&rsquo;re offline. Scanning and diagnostics need an internet
      connection.
    </div>
  );
}
