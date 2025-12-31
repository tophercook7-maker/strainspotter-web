"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 🔐 Get singleton client (initializes on first call)
    const supabase = getSupabaseClient();

    supabase.auth.getSession().finally(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

