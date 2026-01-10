'use client';

import Link from 'next/link';

interface SeedVendor {
  name: string;
  description: string;
  url: string;
}

// Static seed vendor data
const SEED_VENDORS: SeedVendor[] = [
  {
    name: 'North Atlantic Seed Co',
    description: 'US-based seed bank with fast shipping',
    url: 'https://northatlanticseed.com',
  },
  {
    name: 'Seedsman',
    description: 'International seed bank with large selection',
    url: 'https://www.seedsman.com',
  },
  {
    name: 'ILGM',
    description: 'Beginner-friendly seed bank and guides',
    url: 'https://www.ilovegrowingmarijuana.com',
  },
  {
    name: 'Humboldt Seed Company',
    description: 'Breeder-direct genetics from Humboldt County',
    url: 'https://humboldtseedcompany.com',
  },
  {
    name: 'Multiverse Beans',
    description: 'Curated breeder drops and exclusives',
    url: 'https://multiversebeans.com',
  },
];

export default function SeedVendorsPage() {
  return (
    <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/garden"
            className="text-emerald-400 hover:text-emerald-300 mb-4 inline-block text-sm transition"
          >
            ← Back to Garden
          </Link>
          <h1 className="text-3xl font-bold mb-2">Seed Vendors</h1>
          <p className="text-white/70">
            Reputable seed banks and breeders for your grow
          </p>
        </div>

        {/* Vendor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SEED_VENDORS.map((vendor, index) => (
            <div
              key={index}
              className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 hover:border-[var(--botanical-accent)]/40 transition"
            >
              <h3 className="text-xl font-semibold text-[var(--botanical-accent-alt)] mb-2">
                {vendor.name}
              </h3>
              <p className="text-sm text-[var(--botanical-text-secondary)] mb-4">
                {vendor.description}
              </p>
              <a
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
              >
                Visit Website →
              </a>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-white/50 text-center">
            These vendors are provided for informational purposes only. 
            Always verify local laws and regulations before purchasing seeds.
          </p>
        </div>
      </div>
    </div>
  );
}
