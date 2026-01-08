'use client';

import Link from 'next/link';
import MembershipExplanation from '@/components/membership/MembershipExplanation';

export default function GardenMembershipPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">About the Garden</h1>
            <p className="text-sm text-slate-300/80">
              The Garden unlocks deeper insight by connecting scans, notes, and measurements over time.
            </p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <MembershipExplanation
          tier={null}
          showLearnMore={false}
          learnMoreHref={undefined}
          collapsedByDefault={false}
        />
      </div>
    </main>
  );
}

