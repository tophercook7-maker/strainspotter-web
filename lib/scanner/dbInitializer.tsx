// lib/scanner/dbInitializer.tsx
// Phase 5.0.1 — Client-side database initializer
// Loads strain database on app startup

"use client";

import { useEffect } from "react";
import { initializeCultivarLibrary } from "./cultivarLibrary";

/**
 * Phase 5.0.1 — Database Initializer Component
 * 
 * Add this to your root layout or app component to ensure
 * the strain database is loaded on app startup.
 * 
 * Usage:
 * <DatabaseInitializer />
 */
export function DatabaseInitializer() {
  useEffect(() => {
    // Phase 5.0.1 — Initialize database on mount
    initializeCultivarLibrary().catch((error) => {
      console.error("Phase 5.0.1 — Failed to initialize strain database:", error);
      // Error is already logged in initializeCultivarLibrary
      // App can continue with fallback, but will show warnings
    });

    // Expose manual cultivar DB loader for the Scanner page "Load Cultivar DB" button
    (window as unknown as { __STRAINSPOTTER_LOAD_CULTIVARS__?: () => Promise<void> }).__STRAINSPOTTER_LOAD_CULTIVARS__ = async () => {
      await initializeCultivarLibrary();
    };

    return () => {
      delete (window as unknown as { __STRAINSPOTTER_LOAD_CULTIVARS__?: () => Promise<void> }).__STRAINSPOTTER_LOAD_CULTIVARS__;
    };
  }, []);

  return null; // This component doesn't render anything
}
