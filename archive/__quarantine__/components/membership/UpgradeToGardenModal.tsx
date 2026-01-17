'use client';

import React, { useState } from 'react';

interface UpgradeToGardenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => Promise<void>;
}

export default function UpgradeToGardenModal({ isOpen, onClose, onUpgrade }: UpgradeToGardenModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/membership/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'garden' }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upgrade');
      }
      
      if (onUpgrade) {
        await onUpgrade();
      }
      onClose();
      // Reload page to refresh balances
      window.location.reload();
    } catch (error) {
      console.error('Error upgrading:', error);
      alert(error instanceof Error ? error.message : 'Failed to upgrade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-emerald-300 mb-4">Upgrade to Garden</h2>
        
        <div className="mb-6 space-y-3">
          <div className="text-3xl font-bold text-white mb-2">$9.99<span className="text-lg text-slate-400">/month</span></div>
          
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <span>100 regular scans per month</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <span>20 doctor scans per month</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Full Garden access</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <span>Community features</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

