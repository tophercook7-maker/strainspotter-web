'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface DoctorGardenTopupProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: (packageName: string) => Promise<void>;
  onUpgrade: () => void;
}

const PACKAGES = [
  { id: 'doctor-5', label: '5 Doctor Scans', scans: 5, price: 4.99 },
  { id: 'doctor-10', label: '10 Doctor Scans', scans: 10, price: 8.99 },
];

export default function DoctorGardenTopup({ isOpen, onClose, onTopUp, onUpgrade }: DoctorGardenTopupProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTopUp = async () => {
    if (!selectedPackage) return;
    
    setLoading(true);
    try {
      await onTopUp(selectedPackage);
      onClose();
    } catch (error) {
      console.error('Error processing top-up:', error);
      alert('Failed to process top-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-emerald-300 mb-4">Top Up Doctor Scans</h2>
        
        <p className="text-slate-400 mb-6">
          You've used all your Garden doctor scans. Buy more or upgrade to Pro.
        </p>

        <div className="space-y-3 mb-4">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full p-4 rounded-lg border transition text-left ${
                selectedPackage === pkg.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-slate-100 font-semibold">{pkg.label}</div>
                  <div className="text-sm text-slate-400">{pkg.scans} doctor scans</div>
                </div>
                <div className="text-emerald-400 font-bold">${pkg.price}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleTopUp}
          disabled={!selectedPackage || loading}
          className="w-full mb-3 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 transition"
        >
          {loading ? 'Processing...' : `Buy ${selectedPackage ? PACKAGES.find(p => p.id === selectedPackage)?.label : 'Package'}`}
        </button>

        <button
          onClick={onUpgrade}
          className="w-full mb-3 py-3 rounded-lg border border-emerald-500 text-emerald-400 font-semibold hover:bg-emerald-500/10 transition"
        >
          Upgrade to Pro – $39.99/mo
          <div className="text-sm font-normal mt-1">50 doctor scans/month included</div>
        </button>

        <div className="text-center mb-3">
          <Link
            href="/settings/membership"
            className="text-sm text-emerald-400 hover:text-emerald-300 underline"
          >
            View all plans
          </Link>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

