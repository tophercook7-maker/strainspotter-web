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

  const fetchMembership = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/membership/check');
      if (!response.ok) {
        throw new Error('Failed to fetch membership data');
      }

      const data = await response.json();
      setMembership({
        tier: data.membership,
        scans_remaining: data.scans_remaining,
        doctor_scans_remaining: data.doctor_scans_remaining,
        should_reset: data.should_reset || false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching membership:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

