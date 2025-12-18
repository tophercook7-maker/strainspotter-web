'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ScanBalances {
  scans_remaining: number;
  doctor_scans_remaining: number;
  membership: 'free' | 'garden' | 'pro';
  should_reset: boolean;
}

export interface UseScansReturn {
  balances: ScanBalances | null;
  loading: boolean;
  error: string | null;
  checkMembership: () => Promise<void>;
  getScanBalances: () => ScanBalances | null;
  deductScan: (type: 'regular' | 'doctor') => Promise<{ success: boolean; error?: string }>;
  showUpgradeOrTopUpPrompts: (type: 'regular' | 'doctor') => {
    showUpgrade: boolean;
    showTopUp: boolean;
    tier: 'free' | 'garden' | 'pro';
  };
}

export function useScans(): UseScansReturn {
  const [balances, setBalances] = useState<ScanBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkMembership = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/membership/check');
      if (!response.ok) {
        throw new Error('Failed to check membership');
      }

      const data = await response.json();
      setBalances({
        scans_remaining: data.scans_remaining,
        doctor_scans_remaining: data.doctor_scans_remaining,
        membership: data.membership,
        should_reset: data.should_reset || false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error checking membership:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getScanBalances = useCallback(() => {
    return balances;
  }, [balances]);

  const deductScan = useCallback(async (type: 'regular' | 'doctor') => {
    try {
      const response = await fetch('/api/scans/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to deduct scan',
        };
      }

      // Update local state
      if (balances) {
        setBalances({
          ...balances,
          scans_remaining: data.scans_remaining,
          doctor_scans_remaining: data.doctor_scans_remaining,
        });
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, [balances]);

  const showUpgradeOrTopUpPrompts = useCallback((type: 'regular' | 'doctor') => {
    if (!balances) {
      return { showUpgrade: false, showTopUp: false, tier: 'free' as const };
    }

    const { membership, scans_remaining, doctor_scans_remaining } = balances;
    const hasScans = type === 'regular' 
      ? scans_remaining > 0 
      : doctor_scans_remaining > 0;

    if (hasScans) {
      return { showUpgrade: false, showTopUp: false, tier: membership as 'free' | 'garden' | 'pro' };
    }

    // No scans remaining - determine what to show
    if (membership === 'free') {
      return { showUpgrade: true, showTopUp: false, tier: 'free' as const };
    }

    if (membership === 'garden') {
      return { showUpgrade: true, showTopUp: true, tier: 'garden' as const };
    }

    // Pro user - only show top-up
    return { showUpgrade: false, showTopUp: true, tier: 'pro' as const };
  }, [balances]);

  useEffect(() => {
    checkMembership();
  }, [checkMembership]);

  return {
    balances,
    loading,
    error,
    checkMembership,
    getScanBalances,
    deductScan,
    showUpgradeOrTopUpPrompts,
  };
}

