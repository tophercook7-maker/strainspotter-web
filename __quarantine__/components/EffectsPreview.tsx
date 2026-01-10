'use client';

import Link from 'next/link';
import EffectsMatrix from './EffectsMatrix';
import LockedOverlay from '@/components/LockedOverlay';

export default function EffectsPreview({ locked }: { locked: boolean }) {
  // Mock effects data for preview
  const mockEffects = {
    body: 60,
    mental: 75,
    social: 50,
  };

  return (
    <div className="relative">
      {locked && <LockedOverlay />}

      {/* normal component content here */}
      <EffectsMatrix effects={mockEffects as any} />
      <Link
        href="/garden/effects"
        className="block mt-3 w-full py-2 text-center rounded-lg bg-green-500/80 hover:bg-green-500 text-black font-semibold text-sm"
      >
        Explore More →
      </Link>
    </div>
  );
}
