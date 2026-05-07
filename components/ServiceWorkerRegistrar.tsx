"use client";

// components/ServiceWorkerRegistrar.tsx
//
// Registers /sw.js once on mount. Fails silently in dev (where SW is
// undesirable) and in browsers without service worker support.

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost") {
      // Don't register on localhost — caches stale assets during dev.
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // SW registration failure is non-fatal; log and move on.
          console.warn("[StrainSpotter SW]", err?.message || err);
        });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
