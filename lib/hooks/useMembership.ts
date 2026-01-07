'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MembershipData {
  tier: 'free' | 'garden' | 'pro';
  scans_remaining: number;
  doctor_scans_remaining: number;
  should_reset: boolean;
}

export interface UseMembershipReturn {
  membership: MembershipData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMembership(): UseMembershipReturn {
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  const setFreeFallback = (reason: string) => {
    setMembership({
      tier: "free",
      scans_remaining: 0,
      doctor_scans_remaining: 0,
      should_reset: false,
    });
    setError(reason);
  };

  const fetchMembership = useCallback(async () => {
    if (isTauri) {
      // In desktop, do not block rendering on membership; default to free view.
      setMembership(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/membership/check');
      if (!response.ok) {
        if (response.status === 401 && isTauri) {
          setFreeFallback("unauthorized in tauri (treated as free)");
          return;
        }
        throw new Error(`Failed to fetch membership data (${response.status})`);
      }

      const data = await response.json();
      setMembership({
        tier: data.membership,
        scans_remaining: data.scans_remaining,
        doctor_scans_remaining: data.doctor_scans_remaining,
        should_reset: data.should_reset || false,
      });
    } catch (err) {
      if (isTauri) {
        setFreeFallback(err instanceof Error ? err.message : "Unknown error in tauri");
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
      console.error('Error fetching membership:', err);
    } finally {
      setLoading(false);
    }
  }, [isTauri]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  return {
    membership,
    loading,
    error,
    refresh: fetchMembership,
  };
}

