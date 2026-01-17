'use client';

import { useState } from 'react';
import Link from 'next/link';

type MembershipExplanationProps = {
  tier?: 'free' | 'garden' | 'pro' | null;
  showLearnMore?: boolean;
  learnMoreHref?: string;
  collapsedByDefault?: boolean;
};

export default function MembershipExplanation({
  tier,
  showLearnMore = false,
  learnMoreHref,
  collapsedByDefault = false,
}: MembershipExplanationProps) {
  if (tier === 'garden' || tier === 'pro') {
    return null;
  }

  const [open, setOpen] = useState(!collapsedByDefault);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">About the Garden</p>
          <p className="text-sm text-white/70">
            The Garden unlocks deeper insight by connecting scans, notes, and measurements over time.
          </p>
        </div>
        <button
          onClick={() => setOpen((s) => !s)}
          className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <div className="space-y-3">
          <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
            <li>Cultivation diagnostics that adapt as your grow changes</li>
            <li>A living history of scans, notes, and measurements</li>
            <li>Calm guidance based on your own grow patterns</li>
            <li>Personal Garden Chat for reflection and questions</li>
          </ul>

          {showLearnMore && learnMoreHref && (
            <Link
              href={learnMoreHref}
              className="inline-flex items-center px-3 py-2 rounded-md bg-white/10 text-white text-sm border border-white/15 hover:bg-white/15"
            >
              Learn more about Garden access
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

