'use client';

import Link from 'next/link';
import VibeEnginePanel from './VibeEnginePanel';
import LockedOverlay from '@/components/LockedOverlay';

export default function VibePreview({ locked }: { locked: boolean }) {
  // Mock vibe data for preview
  const mockVibe = {
    summary: 'Energetic and uplifting with creative focus',
    resonance: [
      { label: 'Energy', strength: 85 },
      { label: 'Focus', strength: 70 },
      { label: 'Creativity', strength: 60 },
    ],
    reasoning: 'Based on terpene profile and user feedback patterns',
  };

  return (
    <div className="relative">
      {locked && <LockedOverlay />}

      {/* normal component content here */}
      <VibeEnginePanel vibe={mockVibe as any} />
      <Link
        href="/garden/vibe"
        className="block mt-3 w-full py-2 text-center rounded-lg bg-green-500/80 hover:bg-green-500 text-black font-semibold text-sm"
      >
        Explore More →
      </Link>
    </div>
  );
}
