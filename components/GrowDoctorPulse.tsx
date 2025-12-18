'use client';

import Link from 'next/link';
import LockedOverlay from '@/components/LockedOverlay';

export default function GrowDoctorPulse({ locked }: { locked: boolean }) {
  return (
    <div className="relative">
      {locked && <LockedOverlay />}

      {/* normal component content here */}
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-black/30 border border-green-500/20">
          <p className="text-sm text-green-100 mb-2">AI-powered plant health diagnostics</p>
          <p className="text-xs text-green-200/70">Scan leaves to detect deficiencies, pests, and growth issues</p>
        </div>
        <Link
          href="/scanner?mode=doctor"
          className="block w-full py-2 text-center rounded-lg bg-green-500/80 hover:bg-green-500 text-black font-semibold text-sm"
        >
          Start Diagnosis →
        </Link>
      </div>
    </div>
  );
}
