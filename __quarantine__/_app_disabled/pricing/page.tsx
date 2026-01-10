/**
 * Pricing & Business Model
 * 
 * Ethical, defensible revenue model.
 * Knowledge remains free. Advanced capability is paid.
 * 
 * PRINCIPLES:
 * - Optional
 * - Transparent
 * - Value-based
 * - Non-exploitative
 */

'use client';

import Link from 'next/link';

interface RevenuePillar {
  id: string;
  title: string;
  description: string;
  href: string;
  audience: string;
  status: 'available' | 'coming-soon';
}

const PILLARS: RevenuePillar[] = [
  {
    id: 'pro',
    title: 'PRO Tools',
    description: 'Advanced scanner tools, extended history, enhanced analytics for home growers and serious hobbyists.',
    href: '/pricing/pro',
    audience: 'Home growers, hobbyists, professionals',
    status: 'available',
  },
  {
    id: 'professional',
    title: 'Professional Accounts',
    description: 'Batch scanning, workflow tools, and aggregate insights for facilities, labs, breeders, and brands.',
    href: '/pricing/professional',
    audience: 'Grow facilities, labs, breeders, brands',
    status: 'available',
  },
  {
    id: 'verified',
    title: 'Verified Entity Profiles',
    description: 'Optional identity verification for labs, seed banks, breeders, and dispensaries. Informational badge only.',
    href: '/pricing/verified',
    audience: 'Labs, seed banks, breeders, dispensaries',
    status: 'available',
  },
  {
    id: 'enterprise',
    title: 'API & Data Licensing',
    description: 'Anonymized, aggregated datasets for researchers, universities, and public health organizations.',
    href: '/pricing/enterprise',
    audience: 'Researchers, universities, regulators',
    status: 'available',
  },
  {
    id: 'education',
    title: 'Education & Certification',
    description: 'Courses, certifications, and reference exams for growers, budtenders, labs, and inspectors.',
    href: '/pricing/education',
    audience: 'Growers, budtenders, labs, inspectors',
    status: 'coming-soon',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="text-3xl font-semibold text-white mb-3">Pricing & Business Model</h1>
          <p className="text-gray-400 max-w-3xl mx-auto mb-8">
            Knowledge remains free. Advanced capability is paid.
          </p>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-white mb-3">Our Commitment</h2>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              StrainSpotter AI never sells accuracy, visibility, rankings, or outcomes. 
              All scan results remain free and unbiased.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>✓ Optional subscriptions for advanced tools</p>
              <p>✓ Transparent pricing with no hidden costs</p>
              <p>✓ No ads, no paid placement, no affiliate links</p>
              <p>✓ Free tier remains fully usable</p>
            </div>
          </div>
        </div>

        {/* Revenue Pillars */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold mb-8">Revenue Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PILLARS.map((pillar) => (
            <Link
              key={pillar.id}
              href={pillar.href}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-gray-700 hover:bg-gray-900/70 transition-all"
            >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-white">{pillar.title}</h3>
                  {pillar.status === 'coming-soon' && (
                    <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs font-medium rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  {pillar.description}
                </p>
                <p className="text-xs text-gray-500">
                  Audience: {pillar.audience}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* What We Never Sell */}
        <div className="mt-16 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-semibold mb-6">What We Never Sell</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Never</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Ads in scanner results</li>
                <li>• Paid strain placement</li>
                <li>• Paid confidence boosts</li>
                <li>• Affiliate links in Explorer</li>
                <li>• "Best strain" lists</li>
                <li>• User data</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-2">Always Free</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Scanner (basic)</li>
                <li>• Strain Explorer</li>
                <li>• Community access</li>
                <li>• Garden tools (basic)</li>
                <li>• Knowledge base</li>
                <li>• Ecosystem Map</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

