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

'use client';

import Link from "next/link";

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
        <section className="garden-section mb-16">
          <h2 className="garden-section-title text-sm md:text-base font-semibold text-white uppercase tracking-wider">
            ACTIONS
          </h2>
          <div className="garden-card-grid">
            <Link href="/scanner" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Scan a Plant</h3>
              <p className="text-white/80 text-sm">Identify strain or diagnose issues</p>
            </Link>
            <Link href="/garden/logbook/new" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Log an Update</h3>
              <p className="text-white/80 text-sm">Add a logbook entry</p>
            </Link>
            <Link href="/garden/plants/new" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Add a Plant</h3>
              <p className="text-white/80 text-sm">Start tracking a new plant</p>
            </Link>
            <Link href="/garden/tasks/new" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Create a Task</h3>
              <p className="text-white/80 text-sm">Add a task to your list</p>
            </Link>
          </div>
        </section>

        {/* RECORDS */}
        <section className="garden-section mb-16">
          <h2 className="garden-section-title text-sm md:text-base font-semibold text-white uppercase tracking-wider">
            RECORDS
          </h2>
          <div className="garden-card-grid">
            <Link href="/garden/logbook" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Grow Logbook</h3>
              <p className="text-white/80 text-sm">Log entries and notes</p>
            </Link>
            <Link href="/garden/plants" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">My Plants</h3>
              <p className="text-white/80 text-sm">Track your active grows</p>
            </Link>
            <Link href="/garden/environment" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Grow Environment</h3>
              <p className="text-white/80 text-sm">Track temperature, humidity, and more</p>
            </Link>
            <Link href="/garden/tasks" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Tasks</h3>
              <p className="text-white/80 text-sm">Your grow checklist</p>
            </Link>
            <Link href="/garden/notes" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Grow Notes</h3>
              <p className="text-white/80 text-sm">AI-assisted thinking layer</p>
            </Link>
          </div>
        </section>

        {/* INTELLIGENCE */}
        <section className="garden-section mb-16">
          <h2 className="garden-section-title text-sm md:text-base font-semibold text-white uppercase tracking-wider">
            INTELLIGENCE
          </h2>
          <div className="garden-card-grid">
            <Link href="/coach" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Grow Coach</h3>
              <p className="text-white/80 text-sm">AI-powered growing advice</p>
            </Link>
            <Link href="/doctor" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Grow Doctor</h3>
              <p className="text-white/80 text-sm">Diagnose plant issues</p>
            </Link>
            <Link href="/strain-explorer" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Strain Explorer</h3>
              <p className="text-white/80 text-sm">Factual strain reference and knowledge base</p>
            </Link>
          </div>
        </section>

        {/* FIND & BUY */}
        <section className="garden-section mb-16">
          <h2 className="garden-section-title text-sm md:text-base font-semibold text-white uppercase tracking-wider">
            FIND & BUY
          </h2>
          <div className="garden-card-grid">
            <Link href="/discover/dispensaries" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Dispensary Finder</h3>
              <p className="text-white/80 text-sm">Find dispensaries near you</p>
            </Link>
            <Link href="/seeds" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Seed Finder</h3>
              <p className="text-white/80 text-sm">Browse seed sellers and vendors</p>
            </Link>
          </div>
        </section>

        {/* INDUSTRY */}
        <section className="garden-section mb-16">
          <h2 className="garden-section-title text-sm md:text-base font-semibold text-white uppercase tracking-wider">
            INDUSTRY
          </h2>
          <div className="garden-card-grid">
            <Link href="/ecosystem" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Industry Ecosystem</h3>
              <p className="text-white/80 text-sm">Map of the cannabis industry landscape</p>
            </Link>
          </div>
        </section>

        {/* COMMUNITY */}
        <section className="garden-section mb-16">
          <h2 className="garden-section-title text-sm md:text-base font-semibold text-white uppercase tracking-wider">
            COMMUNITY
          </h2>
          <div className="garden-card-grid">
            <Link href="/community" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Community</h3>
              <p className="text-white/80 text-sm">Discussion and tips</p>
            </Link>
            <Link href="/discover/news" className="garden-card">
              <h3 className="text-white font-semibold mb-1.5">Cannabis News</h3>
              <p className="text-white/80 text-sm">Latest industry updates</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
