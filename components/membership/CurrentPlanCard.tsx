'use client';

import React from 'react';

interface CurrentPlanCardProps {
  membership: 'free' | 'garden' | 'pro';
  scansRemaining: number;
  doctorScansRemaining: number;
  lastReset: string;
  onRefresh: () => void;
}

export default function CurrentPlanCard({
  membership,
  scansRemaining,
  doctorScansRemaining,
  lastReset,
  onRefresh,
}: CurrentPlanCardProps) {
  const membershipLabels = {
    free: 'Free',
    garden: 'Garden',
    pro: 'Pro',
  };

  const membershipColors = {
    free: 'text-slate-400',
    garden: 'text-emerald-400',
    pro: 'text-emerald-300',
  };

  // Calculate next reset date (30 days from last reset)
  const lastResetDate = new Date(lastReset);
  const nextResetDate = new Date(lastResetDate);
  nextResetDate.setDate(nextResetDate.getDate() + 30);

  const handleManagePayment = async () => {
    try {
      const response = await fetch('/api/billing/portal');
      if (!response.ok) {
        throw new Error('Failed to get billing portal');
      }
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      alert('Billing portal not available yet');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Current Plan</h2>
          <p className={`text-2xl font-semibold ${membershipColors[membership]}`}>
            {membershipLabels[membership]}
          </p>
        </div>
        <button
          onClick={handleManagePayment}
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition"
        >
          Manage Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Regular Scans</div>
          <div className="text-2xl font-bold text-slate-100">{scansRemaining}</div>
          <div className="text-xs text-slate-500 mt-1">remaining</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Doctor Scans</div>
          <div className="text-2xl font-bold text-slate-100">{doctorScansRemaining}</div>
          <div className="text-xs text-slate-500 mt-1">remaining</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Next Reset</div>
          <div className="text-lg font-semibold text-slate-100">
            {nextResetDate.toLocaleDateString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {Math.ceil((nextResetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      </div>

      {(membership === 'free' || membership === 'garden') && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              // Scroll to top-up section
              document.getElementById('topup-panel')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
          >
            Purchase Top-Ups
          </button>
        </div>
      )}
    </div>
  );
}

