"use client";

import { useEffect } from "react";

export default function AuthSessionReset() {
  useEffect(() => {
    try {
      // Supabase v2 keys - clear localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });

      // Clear all sessionStorage
      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });

      console.warn("🧨 Corrupted Supabase session forcibly cleared");
    } catch (e) {
      console.error("Auth session reset failed", e);
    }
  }, []);

  return null;
}

