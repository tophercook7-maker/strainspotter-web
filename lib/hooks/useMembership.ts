'use client';

import { useState, useCallback, useRef } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  const abortRef = useRef<AbortController | null>(null);

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
      // In desktop, do not block rendering on membership; default to free view without fetching.
      setMembership(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/membership/check', { signal: controller.signal });
      if (!response.ok) {
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
      if (controller.signal.aborted) {
        return;
      }
      setFreeFallback(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching membership:', err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [isTauri]);

  return {
    membership,
    loading,
    error,
    refresh: fetchMembership,
  };
}

