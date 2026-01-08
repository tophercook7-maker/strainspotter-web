import React from 'react';
import Link from 'next/link';
import MembershipExplanation from '@/components/membership/MembershipExplanation';

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex flex-col items-center px-4 py-14">
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-6xl space-y-8">
        {/* HERO */}
        <section className="text-center flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-transparent">
            <img
              src="/brand/core/hero.png"
              alt="StrainSpotter Garden Hero"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-base sm:text-lg">
            A living space where cultivation insight, care, and discovery come together.
          </p>
        </section>

        {/* BUTTON WALL - explicit, unconditional */}
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="text-sm uppercase tracking-[0.08em] text-white/70">Primary</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ActionButton label="Document Plant" href="/scanner" primary />
              <ActionButton label="Grow Doctor" href="/garden/grow-doctor" primary />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm uppercase tracking-[0.08em] text-white/70">Reflection & History</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ActionButton label="Grow Logbook" href="/garden/logbook" />
              <ActionButton label="Measurements" href="/garden/measurements" />
              <ActionButton label="Personal Notes" href="/garden/notes" />
              <ActionButton label="Garden Chat" href="/garden/chat" />
              <ActionButton label="My Grows" href="/garden/grows" />
              <ActionButton label="Session Journal" href="/garden/sessions" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm uppercase tracking-[0.08em] text-white/70">Reference & Info</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ActionButton label="Strain Explorer" href="/strain-explorer" />
              <ActionButton label="Garden Access" href="/garden/membership" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm uppercase tracking-[0.08em] text-white/70">Discovery & Industry</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ActionButton label="COA Explainer" href="/garden/coa" />
            </div>
          </div>
        </section>

        <div>
          <MembershipExplanation
            tier={null}
            showLearnMore={true}
            learnMoreHref="/garden/membership"
            collapsedByDefault={true}
          />
        </div>
      </div>
    </main>
  );
}

function ActionButton({ label, href, primary }: { label: string; href?: string; primary?: boolean }) {
  const className =
    'h-24 rounded-lg border backdrop-blur-md px-4 flex items-center justify-center text-center text-sm sm:text-base font-semibold transition ' +
    (primary
      ? 'bg-white/25 border-white/40 text-white hover:bg-white/30 hover:border-white/50'
      : 'bg-white/15 border-white/25 text-white hover:bg-white/20 hover:border-white/35') +
    ' focus:outline-none focus:ring-2 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-transparent active:translate-y-0';

  if (href) {
    return (
      <Link href={href} className={className}>
        <span className="leading-tight">{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      <span className="leading-tight">{label}</span>
    </button>
  );
}
