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
    name: 'Grow STRNG Seeds',
    description: 'Premium cannabis genetics and seeds',
    url: 'https://growstrng.com',
  },
  {
    name: 'North Atlantic Seed Co.',
    description: 'Trusted seed bank with wide genetic selection',
    url: 'https://northatlanticseed.com',
  },
  {
    name: 'Seedsman',
    description: 'Global cannabis seed marketplace',
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
    name: "Barney's Farm",
    description: 'Award-winning genetics and premium seeds',
    url: 'https://barneysfarm.com',
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

        {/* Featured Seed Vendor Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white/90 mb-4 uppercase tracking-wider">
            Featured Seed Vendor
          </h2>
          <div className="relative bg-[var(--botanical-bg-surface)] border-2 border-green-500/40 rounded-xl p-8 shadow-lg">
            {/* Featured Badge */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full text-xs font-semibold text-green-300 uppercase tracking-wider">
                Featured
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3 pr-20">
              Featured Seed Vendor
            </h3>
            <p className="text-[var(--botanical-text-secondary)] mb-6 max-w-2xl">
              This premium placement highlights trusted seed vendors used by the grower community.
            </p>
            <a
              href="mailto:partners@strainspotter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
            >
              Become a Featured Vendor
            </a>
          </div>
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
