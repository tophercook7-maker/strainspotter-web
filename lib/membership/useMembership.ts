"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export function useMembership() {
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        if (!mounted) return;
        setIsMember(false);
        setTier(null);
        setLoading(false);
        return;
      }

      // TEMP SOURCE OF TRUTH (until billing live)
      // Later replace with real membership table
      const email = auth.session.user.email ?? "";
      const paid = !email.endsWith("@example.com"); // placeholder logic

      if (!mounted) return;
      setIsMember(paid);
      setTier(paid ? "grower" : null);
      setLoading(false);
    }

    check();

    // Listen for auth changes
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { loading, isMember, tier };
}
