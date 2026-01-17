'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScanGate, ScanAccessResult } from '@/lib/hooks/useScanGate';
import RegularFreePaywall from './RegularFreePaywall';
import RegularGardenTopup from './RegularGardenTopup';
import RegularProTopup from './RegularProTopup';
import DoctorFreePaywall from './DoctorFreePaywall';
import DoctorGardenTopup from './DoctorGardenTopup';
import DoctorProTopup from './DoctorProTopup';

interface PaywallManagerProps {
  scanType: 'regular' | 'doctor';
  onAccessGranted?: () => void;
  onAccessDenied?: () => void;
}

export default function PaywallManager({ scanType, onAccessGranted, onAccessDenied }: PaywallManagerProps) {
  const router = useRouter();
  const { checkScanAccess, openCorrectPaywall, refreshMembership } = useScanGate();
  const [accessResult, setAccessResult] = useState<ScanAccessResult | null>(null);
  const [paywallType, setPaywallType] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      setLoading(true);
      const result = await checkScanAccess(scanType);
      setAccessResult(result);

      if (result.hasAccess) {
        setShowPaywall(false);
        setPaywallType(null);
        onAccessGranted?.();
      } else {
        const paywall = openCorrectPaywall(scanType, result);
        setShowPaywall(paywall.showPaywall);
        setPaywallType(paywall.paywallType);
        onAccessDenied?.();
      }
      setLoading(false);
    }

    checkAccess();
  }, [scanType, checkScanAccess, openCorrectPaywall, onAccessGranted, onAccessDenied]);

  const handleTopUp = async (packageName: string) => {
    try {
      const response = await fetch('/api/scans/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: scanType, package: packageName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process top-up');
      }

      // Refresh membership and re-check access
      await refreshMembership();
      const newResult = await checkScanAccess(scanType);
      setAccessResult(newResult);

      if (newResult.hasAccess) {
        setShowPaywall(false);
        setPaywallType(null);
        onAccessGranted?.();
      }
    } catch (error) {
      console.error('Error processing top-up:', error);
      alert(error instanceof Error ? error.message : 'Failed to process top-up');
    }
  };

  const handleUpgrade = () => {
    router.push('/settings/membership');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-300">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!showPaywall || !paywallType) {
    return null;
  }

  return (
    <>
      {paywallType === 'RegularFreePaywall' && (
        <RegularFreePaywall
          isOpen={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            onAccessDenied?.();
          }}
          onUpgrade={handleUpgrade}
        />
      )}
      {paywallType === 'RegularGardenTopup' && (
        <RegularGardenTopup
          isOpen={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            onAccessDenied?.();
          }}
          onTopUp={handleTopUp}
          onUpgrade={handleUpgrade}
        />
      )}
      {paywallType === 'RegularProTopup' && (
        <RegularProTopup
          isOpen={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            onAccessDenied?.();
          }}
          onTopUp={handleTopUp}
        />
      )}
      {paywallType === 'DoctorFreePaywall' && (
        <DoctorFreePaywall
          isOpen={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            onAccessDenied?.();
          }}
          onUpgrade={handleUpgrade}
        />
      )}
      {paywallType === 'DoctorGardenTopup' && (
        <DoctorGardenTopup
          isOpen={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            onAccessDenied?.();
          }}
          onTopUp={handleTopUp}
          onUpgrade={handleUpgrade}
        />
      )}
      {paywallType === 'DoctorProTopup' && (
        <DoctorProTopup
          isOpen={showPaywall}
          onClose={() => {
            setShowPaywall(false);
            onAccessDenied?.();
          }}
          onTopUp={handleTopUp}
        />
      )}
    </>
  );
}

