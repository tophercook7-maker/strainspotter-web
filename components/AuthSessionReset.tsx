"use client";

import { useEffect } from "react";

export default function AuthSessionReset() {
  useEffect(() => {
    try {
      // Remove ALL Supabase auth storage keys
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          sessionStorage.removeItem(key);
        }
      });

      console.warn("🧨 Corrupted Supabase session forcibly cleared");
    } catch (e) {
      console.error("Auth session reset failed", e);
    }
  }, []);

  return null;
}

