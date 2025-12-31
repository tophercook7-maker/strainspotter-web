"use client";

import { useEffect, useState } from "react";
import { createDesktopSafeSupabaseClient } from "@/lib/supabaseClient";

/**
 * AuthGate - Prevents white screen / reload loop
 * 
 * Waits for Supabase session check before rendering children.
 * This prevents flicker and reload loops in desktop wrappers.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createDesktopSafeSupabaseClient(true);

    supabase.auth.getSession().then(() => {
      setReady(true);
    });
  }, []);

  // 🔒 prevents flicker / reload loop
  if (!ready) return null;

  return <>{children}</>;
}

