/**
 * API & Data Licensing (Enterprise)
 * 
 * Anonymized, aggregated datasets for researchers, universities, and public health organizations.
 */

'use client';

import Link from 'next/link';

export default function EnterprisePricingPage() {
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
          <h1 className="text-4xl font-bold mb-4">API & Data Licensing</h1>
          <p className="text-lg text-gray-400">
            Anonymized, aggregated datasets for research and public health.
          </p>
        </div>

        {/* Key Principle */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-3">Ethical Data Licensing</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Anonymized datasets only</li>
            <li>✓ Aggregated data (no individual records)</li>
            <li>✓ Opt-in datasets (users explicitly consent)</li>
            <li>✓ Strict ethical guidelines and use restrictions</li>
            <li>✗ No raw user images</li>
            <li>✗ No personal data</li>
            <li>✗ No individual user tracking</li>
          </ul>
        </div>

        {/* Who It's For */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Who It's For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Researchers</h3>
              <p className="text-sm text-gray-400">Academic and independent research</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Universities</h3>
              <p className="text-sm text-gray-400">Educational institutions and research programs</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Public Health</h3>
              <p className="text-sm text-gray-400">Public health organizations and agencies</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Regulators</h3>
              <p className="text-sm text-gray-400">Regulatory bodies and compliance organizations</p>
            </div>
          </div>
        </section>

        {/* Data Types */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Available Datasets</h2>
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Aggregate Confidence Trends</h3>
              <p className="text-sm text-gray-300 mb-2">Anonymized confidence level distributions over time</p>
              <p className="text-xs text-gray-500">No individual scan data. Aggregated statistics only.</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Pattern Recognition Data</h3>
              <p className="text-sm text-gray-300 mb-2">Phenotype pattern frequencies (anonymized)</p>
              <p className="text-xs text-gray-500">No user images. Pattern signatures only.</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Strain Correlation Data</h3>
              <p className="text-sm text-gray-300 mb-2">Aggregate strain match frequencies</p>
              <p className="text-xs text-gray-500">No individual user scan history. Aggregate statistics.</p>
            </div>
          </div>
        </section>

        {/* API Access */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">API Access</h2>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-300 mb-4">
              Enterprise API access for programmatic data retrieval. Includes:
            </p>
            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>• RESTful API endpoints</li>
              <li>• Rate limit increases</li>
              <li>• Documentation and support</li>
              <li>• Custom dataset delivery (if needed)</li>
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Pricing</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-6">
              Enterprise data licensing is priced based on dataset type, volume, and use case. 
              Contact us to discuss your research needs.
            </p>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-medium mb-1">Research License</h4>
                  <p className="text-sm text-gray-400">For academic and non-commercial research</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-medium mb-1">Commercial License</h4>
                  <p className="text-sm text-gray-400">For commercial applications and products</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="text-white font-medium mb-1">Public Health License</h4>
                  <p className="text-sm text-gray-400">For public health organizations and regulators</p>
                </div>
              </div>
            </div>
            <button className="px-6 py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 transition">
              Contact Sales
            </button>
          </div>
        </section>

        {/* Ethics */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Ethical Guidelines</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ All data is anonymized and aggregated</li>
            <li>✓ Users explicitly opt-in to data sharing</li>
            <li>✓ Strict use case restrictions apply</li>
            <li>✓ Regular compliance audits</li>
            <li>✓ No re-identification possible</li>
            <li>✓ Transparent data practices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

