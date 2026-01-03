/**
 * Professional Accounts Pricing
 * 
 * Batch scanning, workflow tools, and aggregate insights for facilities, labs, breeders, and brands.
 */

'use client';

import Link from 'next/link';

export default function ProfessionalPricingPage() {
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
          <h1 className="text-4xl font-bold mb-4">Professional Accounts</h1>
          <p className="text-lg text-gray-400">
            Batch scanning, workflow tools, and aggregate insights for commercial operations.
          </p>
        </div>

        {/* Key Principle */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-3">Core Principle</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-3">
            Professional accounts <strong>never</strong> get better scan results. They get better context, scale, and workflow.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            Scan accuracy, confidence levels, and match quality are identical to free tier. 
            Professional accounts enable scale, not superiority.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Professional Features</h2>
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Batch Scanning</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Bulk image processing</li>
                <li>• API access for automation</li>
                <li>• CSV/JSON export of batch results</li>
                <li>• Rate limit increases</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Dataset Insights (Aggregate Only)</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Aggregate confidence trends</li>
                <li>• Pattern recognition insights</li>
                <li>• Anonymized aggregate data</li>
                <li>• No individual user data access</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Workflow Tools</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Team account management</li>
                <li>• Custom integrations</li>
                <li>• Compliance-assist tooling (not advice)</li>
                <li>• Priority support</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Ecosystem Visibility (Non-Promoted)</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Optional entity profile listing</li>
                <li>• Informational only (not promoted)</li>
                <li>• No ranking or placement advantages</li>
                <li>• Verified badge (if applicable)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Pricing</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-6">
              Professional accounts are priced based on usage and team size. 
              Contact us for custom pricing that fits your operation.
            </p>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-medium mb-1">Base Plan</h4>
                  <p className="text-sm text-gray-400">Starting at $99/month for small teams</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-medium mb-1">Enterprise Plan</h4>
                  <p className="text-sm text-gray-400">Custom pricing for large facilities</p>
                </div>
              </div>
            </div>
            <button className="px-6 py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 transition">
              Contact Sales
            </button>
          </div>
        </section>

        {/* Guarantee */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What Professional Does NOT Provide</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✗ No better scan accuracy than free tier</li>
            <li>✗ No paid confidence boosts</li>
            <li>✗ No ranking or placement advantages</li>
            <li>✗ No access to individual user data</li>
            <li>✗ No promotion in search results</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

