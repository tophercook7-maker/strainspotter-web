'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const sampleHighlights = [
  { name: 'Limonene', note: 'Often described as bright and citrus-forward.' },
  { name: 'Myrcene', note: 'Commonly associated with earthy, calm profiles.' },
  { name: 'Caryophyllene', note: 'Typically reported as peppery with balanced mood notes.' },
];

export default function StrainExplorerPage() {
  const params = useSearchParams();
  const slug = params.get('slug');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Strain Explorer</h1>
            <p className="text-sm text-slate-300/80">
              Read-only snapshots of strains: effects and terpene highlights.
            </p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Name</h2>
            <p className="text-sm text-slate-300/80">
              {slug ? slug.replace(/-/g, ' ') : 'Strain name appears here when available.'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200">Effects</h3>
            <p className="text-sm text-slate-300/80">
              Commonly associated effects are shown when available. Descriptions stay neutral and educational.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Terpene highlights</h3>
            <div className="space-y-2">
              {sampleHighlights.map((t) => (
                <div key={t.name} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-200 border border-emerald-500/20 text-xs">
                    {t.name}
                  </span>
                  <span className="text-slate-300/80">{t.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/garden"
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border border-slate-700 hover:border-emerald-400/50"
            >
              Back to Garden
            </Link>
            {slug && (
              <Link
                href={`/strain/${slug}`}
                className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
              >
                Open full details
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
