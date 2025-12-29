"use client";

import { useEffect, useState } from "react";
// REMOVED: getSupabaseBrowserClient - no session recovery
// Auth state must be passed as prop or managed in parent component

export function useMembership() {
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    // REMOVED: getSession() and onAuthStateChange() calls
    // Supabase session recovery is disabled to prevent corrupted token crashes
    // Membership state must be managed in React only or passed as prop
    
    // For now, default to non-member until auth is passed explicitly
    setLoading(false);
    setIsMember(false);
    setTier(null);
  }, []);

  return { loading, isMember, tier };
}
