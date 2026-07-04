"use client";

// CloudSyncAgent — mounts once in the garden layout and keeps the eight
// localStorage garden stores mirrored to Supabase user_collections.
// Renders nothing. Signed-out users: no-op (data stays local, as before).
//
// Lifecycle: initial union-merge after auth resolves, then a 20s change scan
// plus a push when the tab hides (the "closed the laptop" case).

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { syncPass } from "@/lib/sync/cloudSync";

let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

const SCAN_MS = 20_000;

export default function CloudSyncAgent() {
  const auth = useOptionalAuth();
  const userId: string | undefined = auth?.user?.id;
  const stateRef = useRef<{ lastPushed: Map<string, string>; initialDone: boolean }>({
    lastPushed: new Map(),
    initialDone: false,
  });

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    const state = stateRef.current;
    let stopped = false;

    const pass = async () => {
      if (stopped) return;
      try {
        await syncPass(supabase, userId, state.lastPushed, !state.initialDone);
        state.initialDone = true;
      } catch { /* offline — next pass retries */ }
    };

    pass(); // initial union-merge
    const interval = setInterval(pass, SCAN_MS);
    const onHide = () => { if (document.visibilityState === "hidden") pass(); };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [userId]);

  return null;
}
