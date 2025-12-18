'use client';

import React from 'react';
import Link from 'next/link';

interface DoctorFreePaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function DoctorFreePaywall({ isOpen, onClose, onUpgrade }: DoctorFreePaywallProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-emerald-300 mb-4">Doctor Scans Not Available</h2>
        
        <p className="text-slate-400 mb-6">
          AI Grow Doctor scans are only available for Garden and Pro members. Upgrade to access advanced plant diagnostics.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onUpgrade}
            className="w-full p-4 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
          >
            Upgrade to Garden – $9.99/mo
            <div className="text-sm font-normal mt-1">Includes 20 doctor scans/month</div>
          </button>
          <button
            onClick={onUpgrade}
            className="w-full p-4 rounded-lg border border-emerald-500 text-emerald-400 font-semibold hover:bg-emerald-500/10 transition"
          >
            Upgrade to Pro – $39.99/mo
            <div className="text-sm font-normal mt-1">Includes 50 doctor scans/month</div>
          </button>
        </div>

        <div className="text-center">
          <Link
            href="/settings/membership"
            className="text-sm text-emerald-400 hover:text-emerald-300 underline"
          >
            View all plans
          </Link>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

