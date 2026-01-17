'use client';

import Link from 'next/link';
import FlavorWheel from './FlavorWheel';
import LockedOverlay from '@/components/LockedOverlay';

export default function FlavorPreview({ locked }: { locked: boolean }) {
  // Mock flavor data for preview
  const mockFlavors = [
    { name: 'Sweet', intensity: 80, hue: 30 },
    { name: 'Berry', intensity: 65, hue: 300 },
    { name: 'Earthy', intensity: 50, hue: 25 },
    { name: 'Pine', intensity: 40, hue: 120 },
  ];

  return (
    <div className="relative">
      {locked && <LockedOverlay />}

      {/* normal component content here */}
      <FlavorWheel flavors={mockFlavors as any} />
      <Link
        href="/garden/flavors"
        className="block mt-3 w-full py-2 text-center rounded-lg bg-green-500/80 hover:bg-green-500 text-black font-semibold text-sm"
      >
        Explore More →
      </Link>
    </div>
  );
}
