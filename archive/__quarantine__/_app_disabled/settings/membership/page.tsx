'use client';

import React, { useEffect, useState } from 'react';
import CurrentPlanCard from '@/components/membership/CurrentPlanCard';
import PlanComparisonGrid from '@/components/membership/PlanComparisonGrid';
import TopUpPanel from '@/components/membership/TopUpPanel';

interface MembershipData {
  membership: 'free' | 'garden' | 'pro';
  scans_remaining: number;
  doctor_scans_remaining: number;
  should_reset: boolean;
  last_reset: string;
}

export default function MembershipPage() {
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembership = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/membership/check');
      if (!response.ok) {
        throw new Error('Failed to fetch membership data');
      }

      const data = await response.json();
      setMembershipData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching membership:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  const handleTopUp = async (type: 'regular' | 'doctor', packageName: string) => {
    try {
      const response = await fetch('/api/scans/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, package: packageName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process top-up');
      }

      // Refresh membership data
      await fetchMembership();
      alert('Top-up successful!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process top-up');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-400">Loading membership data...</p>
        </div>
      </div>
    );
  }

  if (error || !membershipData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-400">Error: {error || 'Failed to load membership data'}</p>
          <button
            onClick={fetchMembership}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-300 mb-6">Membership & Billing</h1>

        {/* Current Plan Panel */}
        <CurrentPlanCard
          membership={membershipData.membership}
          scansRemaining={membershipData.scans_remaining}
          doctorScansRemaining={membershipData.doctor_scans_remaining}
          lastReset={membershipData.last_reset}
          onRefresh={fetchMembership}
        />

        {/* Plan Comparison Grid */}
        <div className="mt-8">
          <PlanComparisonGrid
            currentMembership={membershipData.membership}
            onUpgrade={async (tier) => {
              try {
                const response = await fetch('/api/membership/upgrade', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tier }),
                });

                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.error || 'Failed to upgrade');
                }

                await fetchMembership();
                alert('Upgrade successful!');
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to upgrade');
              }
            }}
          />
        </div>

        {/* Top-Up Panel */}
        <div className="mt-8">
          <TopUpPanel
            membership={membershipData.membership}
            onTopUp={handleTopUp}
          />
        </div>
      </div>
    </div>
  );
}

