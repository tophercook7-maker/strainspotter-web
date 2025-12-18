'use client';

import React, { useState } from 'react';

interface TopUpPanelProps {
  membership: 'free' | 'garden' | 'pro';
  onTopUp: (type: 'regular' | 'doctor', packageName: string) => Promise<void>;
}

const REGULAR_PACKAGES = [
  { id: 'regular-10', label: '10 Regular Scans', scans: 10, price: 2.99 },
  { id: 'regular-25', label: '25 Regular Scans', scans: 25, price: 5.99 },
  { id: 'regular-50', label: '50 Regular Scans', scans: 50, price: 9.99 },
];

const DOCTOR_PACKAGES = [
  { id: 'doctor-5', label: '5 Doctor Scans', scans: 5, price: 4.99 },
  { id: 'doctor-10', label: '10 Doctor Scans', scans: 10, price: 8.99 },
  { id: 'doctor-20', label: '20 Doctor Scans', scans: 20, price: 14.99 },
];

export default function TopUpPanel({ membership, onTopUp }: TopUpPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (type: 'regular' | 'doctor', packageId: string) => {
    setLoading(packageId);
    try {
      await onTopUp(type, packageId);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div id="topup-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Purchase Top-Ups</h2>

      {/* Regular Scan Top-Ups */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Regular Scans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {REGULAR_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-emerald-500 transition"
            >
              <div className="mb-3">
                <div className="text-lg font-semibold text-slate-100">{pkg.label}</div>
                <div className="text-sm text-slate-400">{pkg.scans} scans</div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-emerald-400">${pkg.price}</span>
              </div>
              <button
                onClick={() => handlePurchase('regular', pkg.id)}
                disabled={loading === pkg.id}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                {loading === pkg.id ? 'Processing...' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Doctor Scan Top-Ups */}
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Doctor Scans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {DOCTOR_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-emerald-500 transition"
            >
              <div className="mb-3">
                <div className="text-lg font-semibold text-slate-100">{pkg.label}</div>
                <div className="text-sm text-slate-400">{pkg.scans} doctor scans</div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-emerald-400">${pkg.price}</span>
              </div>
              <button
                onClick={() => handlePurchase('doctor', pkg.id)}
                disabled={loading === pkg.id}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                {loading === pkg.id ? 'Processing...' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

