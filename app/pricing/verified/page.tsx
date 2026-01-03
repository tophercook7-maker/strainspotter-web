/**
 * Verified Entity Profiles
 * 
 * Optional identity verification for labs, seed banks, breeders, and dispensaries.
 * Informational badge only. Never promotional.
 */

'use client';

import Link from 'next/link';

export default function VerifiedPricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/pricing"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Pricing
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Verified Entity Profiles</h1>
          <p className="text-lg text-gray-400">
            Optional identity verification for industry entities. Informational only.
          </p>
        </div>

        {/* Key Principle */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-3">What "Verified" Means</h2>
          <ul className="space-y-2 text-sm text-gray-300 mb-4">
            <li>✓ Identity confirmed through documentation</li>
            <li>✓ Public information accuracy checked</li>
            <li>✓ Business license validation (where applicable)</li>
          </ul>
          <h2 className="text-lg font-semibold text-white mb-3 mt-6">What It Does NOT Mean</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✗ Ranked higher in search results</li>
            <li>✗ Promoted or featured</li>
            <li>✗ Recommended over others</li>
            <li>✗ Endorsed by StrainSpotter</li>
          </ul>
        </div>

        {/* Who It's For */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Who It's For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Laboratories</h3>
              <p className="text-sm text-gray-400">Testing facilities and analysis labs</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Seed Banks</h3>
              <p className="text-sm text-gray-400">Seed distribution and genetics preservation</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Breeders</h3>
              <p className="text-sm text-gray-400">Genetic development and strain creation</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Dispensaries</h3>
              <p className="text-sm text-gray-400">Licensed retail locations</p>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Verification Process</h2>
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">1. Application</h3>
              <p className="text-sm text-gray-300">Submit business information and documentation</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">2. Review</h3>
              <p className="text-sm text-gray-300">Our team verifies identity and public information accuracy</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">3. Badge Display</h3>
              <p className="text-sm text-gray-300">Verified badge appears on entity profile (informational only)</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Pricing</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-3xl font-bold text-white mb-4">$199<span className="text-lg text-gray-400 font-normal">/year</span></p>
            <p className="text-sm text-gray-400 mb-6">
              One-time annual fee per entity. Includes verification review and badge display.
            </p>
            <button className="px-6 py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 transition">
              Coming Soon
            </button>
          </div>
        </section>

        {/* Guarantee */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Verification Guarantee</h3>
          <p className="text-sm text-gray-300 leading-relaxed mb-3">
            Verified status is informational only. It confirms identity and public information accuracy. 
            It does not imply endorsement, promotion, or ranking preference.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            All entities appear in Ecosystem Map equally. Verified badge is a neutral information marker, 
            not a promotional tool.
          </p>
        </div>
      </div>
    </div>
  );
}

