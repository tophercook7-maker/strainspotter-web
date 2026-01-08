'use client';

import Link from 'next/link';

export default function IndustryHubPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Industry Hub</h1>
            <p className="text-sm text-white/70">Tools and knowledge that connect the cannabis ecosystem.</p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            title="Labs & Testing"
            description="Understand how cannabis is tested, verified, and reported."
            buttons={[
              { label: 'COA Explainer', href: '/garden/coa' },
            ]}
            muted="Educational tools for consumers and professionals."
          />

          <Card
            title="Dispensaries & Products"
            description="How products move from cultivation to shelf."
            buttons={[
              { label: 'Dispensary Finder', href: '/garden/dispensaries' },
              { label: 'Product & Brand Library', href: '/garden/products' },
            ]}
          />

          <Card
            title="Growers & Cultivation"
            description="Insights into cultivation practices and plant care."
            buttons={[
              { label: 'Grow Coach', href: '/garden/grow-coach' },
              { label: 'Grow Logbook', href: '/garden/logbook' },
            ]}
          />

          <Card
            title="Professionals"
            description="Advanced tools for labs, growers, and dispensaries."
            buttons={[
              { label: 'Professional Tools (Desktop)', href: '/garden/pro' },
            ]}
            muted="Professional access is separate from consumer features."
          />
        </div>

        <div className="text-xs text-white/50">
          {/* TODO: COA verification badges; pro dashboards; inventory tools; compliance monitoring; device integrations */}
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  description,
  buttons,
  muted,
}: {
  title: string;
  description: string;
  buttons: { label: string; href: string }[];
  muted?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-white/70">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <Link
            key={b.label}
            href={b.href}
            className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
          >
            {b.label}
          </Link>
        ))}
      </div>
      {muted && <p className="text-xs text-white/60">{muted}</p>}
    </div>
  );
}

