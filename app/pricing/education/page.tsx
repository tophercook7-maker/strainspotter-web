/**
 * Education & Certification (Coming Soon)
 * 
 * Courses, certifications, and reference exams for growers, budtenders, labs, and inspectors.
 */

'use client';

import Link from 'next/link';

export default function EducationPricingPage() {
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
          <div className="inline-block px-4 py-2 bg-gray-800 text-gray-400 text-sm font-medium rounded mb-4">
            Coming Soon
          </div>
          <h1 className="text-4xl font-bold mb-4">Education & Certification</h1>
          <p className="text-lg text-gray-400">
            Courses, certifications, and reference exams for industry professionals.
          </p>
        </div>

        {/* Key Principle */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-3">Educational Authority</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Education and certification programs will serve as educational authority, not marketing. 
            Courses will be factual, evidence-based, and designed to improve industry knowledge and standards.
          </p>
        </div>

        {/* Who It's For */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Who It's For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Growers</h3>
              <p className="text-sm text-gray-400">Cultivation best practices and strain identification</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Budtenders</h3>
              <p className="text-sm text-gray-400">Product knowledge and customer education</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Labs</h3>
              <p className="text-sm text-gray-400">Testing protocols and quality assurance</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Inspectors</h3>
              <p className="text-sm text-gray-400">Compliance and regulatory standards</p>
            </div>
          </div>
        </section>

        {/* Planned Offerings */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Planned Offerings</h2>
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Courses</h3>
              <p className="text-sm text-gray-300">Self-paced and instructor-led courses on cannabis cultivation, identification, and industry knowledge.</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Certifications</h3>
              <p className="text-sm text-gray-300">Industry-recognized certifications for professionals seeking credential validation.</p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Reference Exams</h3>
              <p className="text-sm text-gray-300">Practice exams and knowledge assessments for skill verification.</p>
            </div>
          </div>
        </section>

        {/* Coming Soon Notice */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-4">
            Education and certification programs are in development.
          </p>
          <p className="text-sm text-gray-400">
            Sign up to be notified when programs launch.
          </p>
          <button className="mt-6 px-6 py-3 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition cursor-not-allowed" disabled>
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

