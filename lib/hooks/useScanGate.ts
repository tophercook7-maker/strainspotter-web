'use client';

import { useState, useCallback } from 'react';

export interface ScanAccessResult {
  hasAccess: boolean;
  userTier: 'free' | 'garden' | 'pro';
  scansRemaining: number;
  doctorScansRemaining: number;
}

export interface UseScanGateReturn {
  checkScanAccess: (type: 'regular' | 'doctor') => Promise<ScanAccessResult>;
  openCorrectPaywall: (type: 'regular' | 'doctor', result: ScanAccessResult) => {
    showPaywall: boolean;
    paywallType: string | null;
  };
  deductScan: (type: 'regular' | 'doctor') => Promise<{ success: boolean; error?: string }>;
  refreshMembership: () => Promise<ScanAccessResult | null>;
  userTier: 'free' | 'garden' | 'pro' | null;
  loading: boolean;
}

export function useScanGate(): UseScanGateReturn {
  const [userTier, setUserTier] = useState<'free' | 'garden' | 'pro' | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshMembership = useCallback(async (): Promise<ScanAccessResult | null> => {
    try {
      setLoading(true);
      const response = await fetch('/api/membership/check');
      if (!response.ok) {
        throw new Error('Failed to check membership');
      }

      const data = await response.json();
      setUserTier(data.membership);
      
      return {
        hasAccess: true,
        userTier: data.membership,
        scansRemaining: data.scans_remaining,
        doctorScansRemaining: data.doctor_scans_remaining,
      };
    } catch (error) {
      console.error('Error refreshing membership:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkScanAccess = useCallback(async (type: 'regular' | 'doctor'): Promise<ScanAccessResult> => {
    const membership = await refreshMembership();
    if (!membership) {
      return {
        hasAccess: false,
        userTier: 'free',
        scansRemaining: 0,
        doctorScansRemaining: 0,
      };
    }

    if (type === 'regular') {
      return {
        hasAccess: membership.scansRemaining > 0,
        userTier: membership.userTier,
        scansRemaining: membership.scansRemaining,
        doctorScansRemaining: membership.doctorScansRemaining,
      };
    }

    if (type === 'doctor') {
      return {
        hasAccess: membership.doctorScansRemaining > 0,
        userTier: membership.userTier,
        scansRemaining: membership.scansRemaining,
        doctorScansRemaining: membership.doctorScansRemaining,
      };
    }

    return membership;
  }, [refreshMembership]);

  const openCorrectPaywall = useCallback((type: 'regular' | 'doctor', result: ScanAccessResult) => {
    if (type === 'regular') {
      if (result.userTier === 'free' && result.scansRemaining === 0) {
        return { showPaywall: true, paywallType: 'RegularFreePaywall' };
      }
      if (result.userTier === 'garden' && result.scansRemaining === 0) {
        return { showPaywall: true, paywallType: 'RegularGardenTopup' };
      }
      if (result.userTier === 'pro' && result.scansRemaining === 0) {
        return { showPaywall: true, paywallType: 'RegularProTopup' };
      }
    }

    if (type === 'doctor') {
      if (result.userTier === 'free') {
        return { showPaywall: true, paywallType: 'DoctorFreePaywall' };
      }
      if (result.userTier === 'garden' && result.doctorScansRemaining === 0) {
        return { showPaywall: true, paywallType: 'DoctorGardenTopup' };
      }
      if (result.userTier === 'pro' && result.doctorScansRemaining === 0) {
        return { showPaywall: true, paywallType: 'DoctorProTopup' };
      }
    }

    return { showPaywall: false, paywallType: null };
  }, []);

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

      // Refresh membership after successful deduction
      await refreshMembership();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [refreshMembership]);

  return {
    checkScanAccess,
    openCorrectPaywall,
    deductScan,
    refreshMembership,
    userTier,
    loading,
  };
}

