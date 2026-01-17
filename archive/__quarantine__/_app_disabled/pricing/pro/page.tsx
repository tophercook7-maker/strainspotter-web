/**
 * PRO Tools Pricing
 * 
 * Advanced capability for home growers, hobbyists, and professionals.
 * Knowledge remains free. Enhanced tools are paid.
 */

'use client';

import Link from 'next/link';

export default function ProPricingPage() {
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
          <h1 className="text-4xl font-bold mb-4">PRO Tools</h1>
          <p className="text-lg text-gray-400">
            Advanced scanner tools, extended history, and enhanced analytics for serious growers.
          </p>
        </div>

        {/* Key Principle */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-3">Core Principle</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            PRO tools enhance your workflow and insights. They <strong>never</strong> affect scan accuracy, 
            confidence levels, or result quality. Free tier scan results are identical to PRO scan results.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">PRO Features</h2>
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Advanced Scanner Tools</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Batch scanning (multiple images)</li>
                <li>• Scan comparison tools</li>
                <li>• Advanced confidence breakdowns</li>
                <li>• Historical pattern analysis</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Extended History</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Unlimited scan history (free: last 50 scans)</li>
                <li>• Advanced search and filtering</li>
                <li>• Exportable scan logs (CSV, JSON)</li>
                <li>• Scan annotation and notes</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Enhanced Analytics</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Personal strain trend analysis</li>
                <li>• Grow analytics and insights</li>
                <li>• Confidence pattern tracking</li>
                <li>• Custom reports and visualizations</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Enhanced Garden Tools</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Advanced logbook features</li>
                <li>• Extended plant tracking</li>
                <li>• Enhanced environment monitoring</li>
                <li>• Exportable grow logs</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Monthly</h3>
              <p className="text-3xl font-bold text-white mb-4">$9.99<span className="text-lg text-gray-400 font-normal">/month</span></p>
              <p className="text-sm text-gray-400 mb-6">Billed monthly. Cancel anytime.</p>
              <button className="w-full px-6 py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 transition">
                Coming Soon
              </button>
            </div>

            <div className="bg-gray-900 border-2 border-green-500/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-white">Annual</h3>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                  Save 20%
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-4">$95.99<span className="text-lg text-gray-400 font-normal">/year</span></p>
              <p className="text-sm text-gray-400 mb-6">Billed annually. Cancel anytime.</p>
              <button className="w-full px-6 py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 transition">
                Coming Soon
              </button>
            </div>
          </div>
        </section>

        {/* Guarantee */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What PRO Does NOT Change</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Scan accuracy remains identical to free tier</li>
            <li>✓ Confidence levels are never altered</li>
            <li>✓ No priority processing or faster results</li>
            <li>✓ No access to different strain databases</li>
            <li>✓ All core features remain free</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

