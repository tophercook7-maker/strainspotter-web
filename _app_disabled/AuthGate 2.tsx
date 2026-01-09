"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 🔐 Use single client instance
    supabase.auth.getSession().finally(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

