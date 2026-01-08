import React from 'react';
import Link from 'next/link';
import MembershipExplanation from '@/components/membership/MembershipExplanation';

const sections = [
  {
    id: 'core',
    title: 'Core',
    actions: [
      { label: 'Scan a Plant', href: '/scanner' },
      { label: 'Visual Strain Matching', href: '/visual-match' },
      { label: 'Strain Explorer', href: '/strain-explorer' },
      { label: 'My Grows', href: '/garden/grows' },
      { label: 'Saved Scans', href: '/scanner/saved' },
    ],
  },
  {
    id: 'growing',
    title: 'Growing',
    actions: [
      { label: 'Grow Logbook', href: '/garden/logbook' },
      { label: 'Environment', href: '/garden/environment' },
      { label: 'Tasks & Reminders', href: '/garden/tasks' },
      { label: 'Grow Coach', href: '/garden/grow-coach' },
      { label: 'Grow Doctor', href: '/garden/grow-doctor' },
      { label: 'Grow Recipes', href: '/garden/recipes' },
      { label: 'Nutrient Guide', href: '/garden/nutrients' },
      { label: 'Issue Diagnostics', href: '/garden/diagnostics' },
      { label: 'Yield Tracker', href: '/garden/yield' },
    ],
  },
  {
    id: 'science',
    title: 'Science & Data',
    actions: [
      { label: 'Terpene Library', href: '/library/terpenes' },
      { label: 'Cannabinoid Guide', href: '/library/cannabinoids' },
      { label: 'Strain Genetics', href: '/library/genetics' },
      { label: 'Confidence Engine' },
      { label: 'Image Library', href: '/library/images' },
    ],
  },
  {
    id: 'discover',
    title: 'Discover & Buy',
    actions: [
      { label: 'Dispensary Finder', href: '/garden/dispensaries' },
      { label: 'Seed Finder', href: '/seeds' },
      { label: 'Cannabis News', href: '/discover/news' },
    ],
  },
  {
    id: 'community',
    title: 'Community & System',
    actions: [
      { label: 'Education Hub', href: '/education' },
      { label: 'Community / Notes', href: '/community' },
      { label: 'Settings & Preferences', href: '/settings' },
      { label: 'Membership', href: '/garden/membership' },
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
