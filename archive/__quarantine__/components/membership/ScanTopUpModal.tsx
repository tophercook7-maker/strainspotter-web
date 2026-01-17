'use client';

import React, { useState } from 'react';

interface ScanTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp?: (packageName: string) => Promise<void>;
}

const PACKAGES = [
  { id: 'regular-10', label: '10 Regular Scans', scans: 10, price: 2.99 },
  { id: 'regular-25', label: '25 Regular Scans', scans: 25, price: 5.99 },
  { id: 'regular-50', label: '50 Regular Scans', scans: 50, price: 9.99 },
];

export default function ScanTopUpModal({ isOpen, onClose, onTopUp }: ScanTopUpModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTopUp = async () => {
    if (!selectedPackage) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/scans/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'regular', package: selectedPackage }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process top-up');
      }
      
      if (onTopUp) {
        await onTopUp(selectedPackage);
      }
      onClose();
      // Reload page to refresh balances
      window.location.reload();
    } catch (error) {
      console.error('Error processing top-up:', error);
      alert(error instanceof Error ? error.message : 'Failed to process top-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-emerald-300 mb-4">Top Up Regular Scans</h2>
        
        <div className="space-y-3 mb-6">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full p-4 rounded-lg border transition ${
                selectedPackage === pkg.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-slate-100 font-semibold">{pkg.label}</div>
                  <div className="text-sm text-slate-400">{pkg.scans} scans</div>
                </div>
                <div className="text-emerald-400 font-bold">${pkg.price}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleTopUp}
            disabled={!selectedPackage || loading}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}

