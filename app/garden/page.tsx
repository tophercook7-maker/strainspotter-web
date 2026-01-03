/**
 * ⚠️ GARDEN VISUALS LOCKED — CANONICAL IMPLEMENTATION
 * 
 * LOCKED ELEMENTS (DO NOT MODIFY):
 * - Layout structure (app/garden/layout.tsx)
 * - Hero component (garden-hero-wrapper, garden-hero)
 * - Background image and overlay
 * 
 * CONTENT ONLY: Card buttons following canonical sections and routes.
 */

import Link from "next/link";

// Canonical Garden Sections and Routes
const ACTIONS = [
  { href: "/scanner", label: "Scan a Plant", description: "Identify strain or diagnose issues", primary: true },
  { href: "/garden/logbook?new=true", label: "Log an Update", description: "Add a logbook entry" },
  { href: "/garden/plants/new", label: "Add a Plant", description: "Start tracking a new plant" },
  { href: "/garden/tasks/new", label: "Create a Task", description: "Add a task to your list" },
];

const RECORDS = [
  { href: "/garden/logbook", label: "Grow Logbook", description: "Log entries and notes" },
  { href: "/garden/plants", label: "My Plants", description: "Track your active grows" },
  { href: "/garden/environment", label: "Grow Environment", description: "Track temperature, humidity, and more" },
  { href: "/garden/tasks", label: "Tasks", description: "Your grow checklist" },
  { href: "/garden/notes", label: "Grow Notes", description: "AI-assisted thinking layer" },
  { href: "/strains", label: "Strain Explorer", description: "Factual strain reference and knowledge base" },
];

const INTELLIGENCE = [
  { href: "/garden/grow-coach", label: "Grow Coach", description: "AI-powered growing advice" },
  { href: "/garden/grow-doctor", label: "Grow Doctor", description: "Diagnose plant issues" },
];

const FIND_BUY = [
  { href: "/garden/dispensaries", label: "Dispensary Finder", description: "Find dispensaries near you" },
  { href: "/seeds", label: "Seed Finder", description: "Browse seed sellers and vendors" },
];

const COMMUNITY_NEWS = [
  { href: "/community", label: "Community", description: "Discussion and tips" },
  { href: "/discover/news", label: "Cannabis News", description: "Latest industry updates" },
];

export default function GardenPage() {
  return (
    <div className="garden-page-content">
      {/* Hero Section - Correct stacking order */}
      <div className="mb-12 flex flex-col items-center">
        {/* 1. Page Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
          The Garden
        </h1>
        
        {/* 2. Hero Badge - Positioned UNDER title */}
        <div className="garden-hero-wrapper">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter Leaf"
            className="garden-hero"
          />
        </div>
        
        {/* 3. Subtitle - Under hero badge */}
        <p className="text-sm text-white/80 text-center max-w-md mt-4">
          Everything related to your grow, tools, and intelligence
        </p>
      </div>

      {/* Content Container - Centered, wraps ALL content below hero */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* ACTIONS */}
        <section className="mb-16">
          <h2 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider mb-6">
            ACTIONS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ACTIONS.map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                className={`
                  rounded-xl backdrop-blur-md border
                  ${btn.primary ? 'bg-white/18 border-white/20 p-6 min-h-[120px]' : 'bg-white/10 border-white/10 p-6 min-h-[100px]'}
                  hover:bg-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-white/10
                  ${btn.primary ? 'hover:scale-[1.02] hover:bg-white/22' : 'hover:scale-[1.01]'}
                  active:bg-white/12 active:scale-[0.99]
                  transition-all flex flex-col justify-center cursor-pointer block
                `}
              >
                <div className={`${btn.primary ? 'text-lg font-semibold' : 'text-base font-medium'} text-white mb-1.5`}>
                  {btn.label}
                </div>
                <div className="text-sm text-white/70">
                  {btn.description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* RECORDS */}
        <section className="mb-16">
          <h2 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider mb-6">
            RECORDS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {RECORDS.map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6 min-h-[100px] hover:bg-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-white/10 hover:scale-[1.01] active:bg-white/12 active:scale-[0.99] transition-all flex flex-col justify-center cursor-pointer block"
              >
                <div className="text-base font-medium text-white mb-1.5">
                  {btn.label}
                </div>
                <div className="text-sm text-white/70">
                  {btn.description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* INTELLIGENCE */}
        <section className="mb-16">
          <h2 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider mb-6">
            INTELLIGENCE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {INTELLIGENCE.map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6 min-h-[100px] hover:bg-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-white/10 hover:scale-[1.01] active:bg-white/12 active:scale-[0.99] transition-all flex flex-col justify-center cursor-pointer block"
              >
                <div className="text-base font-medium text-white mb-1.5">
                  {btn.label}
                </div>
                <div className="text-sm text-white/70">
                  {btn.description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FIND & BUY */}
        <section className="mb-16">
          <h2 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider mb-6">
            FIND & BUY
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {FIND_BUY.map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6 min-h-[100px] hover:bg-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-white/10 hover:scale-[1.01] active:bg-white/12 active:scale-[0.99] transition-all flex flex-col justify-center cursor-pointer block"
              >
                <div className="text-base font-medium text-white mb-1.5">
                  {btn.label}
                </div>
                <div className="text-sm text-white/70">
                  {btn.description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* COMMUNITY & NEWS */}
        <section className="mb-16">
          <h2 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider mb-6">
            COMMUNITY & NEWS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {COMMUNITY_NEWS.map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6 min-h-[100px] hover:bg-white/15 hover:border-white/20 hover:shadow-lg hover:shadow-white/10 hover:scale-[1.01] active:bg-white/12 active:scale-[0.99] transition-all flex flex-col justify-center cursor-pointer block"
              >
                <div className="text-base font-medium text-white mb-1.5">
                  {btn.label}
                </div>
                <div className="text-sm text-white/70">
                  {btn.description}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
