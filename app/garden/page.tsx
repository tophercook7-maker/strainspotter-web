import React from 'react';
import Link from 'next/link';
import MembershipExplanation from '@/components/membership/MembershipExplanation';

const sections = [
  {
    id: 'primary',
    title: 'Primary',
    actions: [
      { label: 'Document plant', href: '/scanner', primary: true },
      { label: 'Grow Doctor', href: '/garden/grow-doctor', primary: true },
    ],
  },
  {
    id: 'reflection',
    title: 'Reflection & History',
    actions: [
      { label: 'Grow Logbook', href: '/garden/logbook' },
      { label: 'Measurements', href: '/garden/measurements' },
      { label: 'Personal Notes', href: '/garden/notes' },
      { label: 'Garden Chat', href: '/garden/chat' },
      { label: 'My Grows', href: '/garden/grows' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference & Info',
    actions: [
      { label: 'Strain Explorer', href: '/strain-explorer' },
      { label: 'Garden Access', href: '/garden/membership' },
    ],
  },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex flex-col items-center px-4 py-14">
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-6xl">
        {/* HERO */}
        <section className="text-center mb-8 flex flex-col items-center gap-3">
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

        {/* BUTTON WALL */}
        <section className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="text-sm uppercase tracking-[0.08em] text-white/70">
                {section.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {section.actions.map((action) => (
                  <ActionButton key={action.label} label={action.label} href={action.href} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-8">
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

function ActionButton({ label, href }: { label: string; href?: string }) {
  const className =
    'h-24 rounded-lg bg-white/20 border border-white/25 backdrop-blur-md px-4 flex items-center justify-center text-center text-sm sm:text-base font-semibold text-white transition ' +
    'hover:bg-white/25 hover:border-white/35 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-transparent active:translate-y-0';

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
