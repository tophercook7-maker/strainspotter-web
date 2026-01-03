/**
 * Cannabis Industry Ecosystem Map
 * 
 * Neutral, comprehensive map of the marijuana industry ecosystem.
 * StrainSpotter becomes the one-stop reference layer.
 * 
 * NOT a marketplace. NOT ads. NOT affiliate-driven.
 * It is an ecosystem index + navigation hub.
 */

'use client';

import Link from 'next/link';

interface EcosystemCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
}

const CATEGORIES: EcosystemCategory[] = [
  {
    id: 'growers',
    name: 'Growers',
    slug: 'growers',
    description: 'Home, commercial, and craft cultivation operations',
  },
  {
    id: 'breeders-genetics',
    name: 'Breeders & Genetics',
    slug: 'breeders-genetics',
    description: 'Genetic development and strain creation',
  },
  {
    id: 'seed-banks',
    name: 'Seed Banks',
    slug: 'seed-banks',
    description: 'Seed distribution and genetics preservation',
  },
  {
    id: 'laboratories-testing',
    name: 'Laboratories & Testing',
    slug: 'laboratories-testing',
    description: 'Cannabis testing, potency, and quality analysis',
  },
  {
    id: 'dispensaries-retail',
    name: 'Dispensaries & Retail',
    slug: 'dispensaries-retail',
    description: 'Retail locations and distribution channels',
  },
  {
    id: 'brands-products',
    name: 'Brands & Products',
    slug: 'brands-products',
    description: 'Consumer brands and product lines',
  },
  {
    id: 'equipment-technology',
    name: 'Equipment & Technology',
    slug: 'equipment-technology',
    description: 'Growing equipment, tools, and tech solutions',
  },
  {
    id: 'research-science',
    name: 'Research & Science',
    slug: 'research-science',
    description: 'Scientific research and academic institutions',
  },
  {
    id: 'media-news',
    name: 'Media & News',
    slug: 'media-news',
    description: 'Cannabis media, publications, and journalism',
  },
  {
    id: 'community-advocacy',
    name: 'Community & Advocacy',
    slug: 'community-advocacy',
    description: 'Advocacy groups, communities, and organizations',
  },
];

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Cannabis Industry Ecosystem</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            A neutral map of the modern cannabis landscape
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/ecosystem/${category.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 hover:bg-gray-900/80 transition-all"
            >
              <h3 className="text-xl font-semibold text-white mb-3">{category.name}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {category.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500 text-center max-w-2xl mx-auto">
            The Ecosystem Map is a neutral reference index. Inclusion does not imply endorsement. 
            This is an informational resource only.
          </p>
        </div>
      </div>
    </div>
  );
}

