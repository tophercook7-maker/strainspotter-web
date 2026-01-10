/**
 * Ecosystem Category Detail Page
 * 
 * Individual category pages with overview, subcategories, entity index, and connections.
 * Neutral, informational only. No rankings, endorsements, or ads.
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  overview: string;
  whyItMatters: string;
  subcategories?: Array<{ name: string; description: string }>;
  entityExamples?: string[]; // Placeholder - in real implementation, would come from database
  connections: {
    scanner?: string;
    strainExplorer?: string;
    garden?: string;
    community?: string;
  };
}

const CATEGORY_DATA: Record<string, CategoryData> = {
  growers: {
    id: 'growers',
    name: 'Growers',
    slug: 'growers',
    overview: 'Cannabis cultivation operations ranging from home gardens to commercial facilities. Growers are the foundation of the industry, producing the raw plant material that flows through the entire ecosystem.',
    whyItMatters: 'Growers determine strain availability, quality, and diversity. Their cultivation practices influence phenotype expression, potency, and the overall supply chain.',
    subcategories: [
      { name: 'Home Growers', description: 'Personal cultivation for individual use' },
      { name: 'Commercial Growers', description: 'Large-scale licensed cultivation operations' },
      { name: 'Craft Growers', description: 'Small to medium-scale artisanal cultivation' },
    ],
    entityExamples: [], // Placeholder
    connections: {
      scanner: 'Scanner helps growers identify strains and diagnose plant health issues.',
      strainExplorer: 'Strain Explorer provides reference data on genetics and phenotypes.',
      garden: 'Garden tools support cultivation tracking and management.',
      community: 'Community connects growers for knowledge sharing and collaboration.',
    },
  },
  'breeders-genetics': {
    id: 'breeders-genetics',
    name: 'Breeders & Genetics',
    slug: 'breeders-genetics',
    overview: 'Organizations and individuals focused on genetic development, strain creation, and preservation of cannabis genetics.',
    whyItMatters: 'Breeders create the genetic diversity that drives strain innovation. They develop new phenotypes, stabilize genetics, and preserve heirloom varieties.',
    entityExamples: [],
    connections: {
      strainExplorer: 'Strain Explorer catalogs breed lines, parent strains, and genetic lineages.',
      scanner: 'Scanner helps identify stable phenotypes and genetic expressions.',
      garden: 'Garden tools assist breeders in tracking genetic development and selection.',
    },
  },
  'seed-banks': {
    id: 'seed-banks',
    name: 'Seed Banks',
    slug: 'seed-banks',
    overview: 'Organizations that collect, preserve, and distribute cannabis seeds and genetics.',
    whyItMatters: 'Seed banks maintain genetic diversity, preserve rare strains, and ensure long-term availability of genetics for growers and breeders.',
    entityExamples: [],
    connections: {
      strainExplorer: 'Strain Explorer references seed sources and genetic availability.',
      garden: 'Garden tools help track seed origins and genetic information.',
    },
  },
  'laboratories-testing': {
    id: 'laboratories-testing',
    name: 'Laboratories & Testing',
    slug: 'laboratories-testing',
    overview: 'Certified testing facilities that analyze cannabis for potency, terpenes, contaminants, and compliance.',
    whyItMatters: 'Laboratories provide the scientific data that ensures safety, compliance, and quality standards throughout the industry.',
    subcategories: [
      { name: 'Potency Testing', description: 'THC, CBD, and cannabinoid analysis' },
      { name: 'Terpene Profiling', description: 'Aromatic compound identification and quantification' },
      { name: 'Contaminant Testing', description: 'Pesticides, heavy metals, and microbial analysis' },
    ],
    entityExamples: [],
    connections: {
      strainExplorer: 'Strain Explorer incorporates lab test data for terpene profiles and potency ranges.',
      scanner: 'Scanner results can be validated against lab test data for accuracy.',
    },
  },
  'dispensaries-retail': {
    id: 'dispensaries-retail',
    name: 'Dispensaries & Retail',
    slug: 'dispensaries-retail',
    overview: 'Licensed retail locations and distribution channels that connect products with consumers.',
    whyItMatters: 'Dispensaries are the primary consumer interface, providing access, education, and product selection.',
    entityExamples: [],
    connections: {
      scanner: 'Scanner helps consumers verify strain identity and product authenticity.',
      strainExplorer: 'Strain Explorer provides reference information for product selection.',
      garden: 'Garden tools help consumers track purchases and experiences.',
    },
  },
  'brands-products': {
    id: 'brands-products',
    name: 'Brands & Products',
    slug: 'brands-products',
    overview: 'Consumer-facing brands that develop, market, and distribute cannabis products.',
    whyItMatters: 'Brands drive consumer education, product innovation, and market differentiation.',
    entityExamples: [],
    connections: {
      scanner: 'Scanner helps verify brand product authenticity and strain accuracy.',
      strainExplorer: 'Strain Explorer provides reference data for brand product information.',
    },
  },
  'equipment-technology': {
    id: 'equipment-technology',
    name: 'Equipment & Technology',
    slug: 'equipment-technology',
    overview: 'Hardware, software, and technology solutions that support cultivation, processing, and distribution.',
    whyItMatters: 'Equipment and technology enable efficient cultivation, quality control, and industry scalability.',
    entityExamples: [],
    connections: {
      scanner: 'Scanner utilizes imaging technology for strain identification.',
      garden: 'Garden tools integrate with equipment for automated monitoring and control.',
    },
  },
  'research-science': {
    id: 'research-science',
    name: 'Research & Science',
    slug: 'research-science',
    overview: 'Academic institutions, research organizations, and scientific studies advancing cannabis knowledge.',
    whyItMatters: 'Research provides the scientific foundation for understanding cannabis genetics, effects, and applications.',
    entityExamples: [],
    connections: {
      strainExplorer: 'Strain Explorer incorporates research findings into strain data.',
      scanner: 'Scanner methodology is informed by scientific research on visual identification.',
    },
  },
  'media-news': {
    id: 'media-news',
    name: 'Media & News',
    slug: 'media-news',
    overview: 'Publications, journalists, and media outlets covering cannabis industry news, culture, and information.',
    whyItMatters: 'Media provides industry information, education, and connects the community.',
    entityExamples: [],
    connections: {
      community: 'Community features media content and news sharing.',
    },
  },
  'community-advocacy': {
    id: 'community-advocacy',
    name: 'Community & Advocacy',
    slug: 'community-advocacy',
    overview: 'Advocacy groups, community organizations, and grassroots movements supporting cannabis rights and education.',
    whyItMatters: 'Community and advocacy drive policy change, education, and industry growth.',
    entityExamples: [],
    connections: {
      community: 'Community platform supports advocacy efforts and organizing.',
      strainExplorer: 'Strain Explorer serves as a neutral knowledge base for advocacy education.',
    },
  },
};

export default function EcosystemCategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const [category, setCategory] = useState<CategoryData | null>(null);

  useEffect(() => {
    const data = CATEGORY_DATA[categorySlug];
    setCategory(data || null);
  }, [categorySlug]);

  if (!category) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Link
            href="/ecosystem"
            className="text-green-400 hover:text-green-300 underline"
          >
            Back to Ecosystem Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/ecosystem"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Ecosystem Map
          </Link>
        </div>

        {/* Category Name */}
        <h1 className="text-4xl font-bold mb-8">{category.name}</h1>

        {/* 1. Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Overview
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            {category.overview}
          </p>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Why It Matters</h3>
            <p className="text-sm text-gray-300">
              {category.whyItMatters}
            </p>
          </div>
        </section>

        {/* 2. Subcategories */}
        {category.subcategories && category.subcategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
              Subcategories
            </h2>
            <div className="space-y-4">
              {category.subcategories.map((subcat, idx) => (
                <div key={idx} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">{subcat.name}</h3>
                  <p className="text-sm text-gray-300">{subcat.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Entity Index (Placeholder) */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Entity Index
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Known entities in this category. Inclusion does not imply endorsement.
          </p>
          {category.entityExamples && category.entityExamples.length > 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <ul className="space-y-2">
                {category.entityExamples.map((entity, idx) => (
                  <li key={idx} className="text-gray-300">{entity}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <p className="text-gray-500 text-sm">
                Entity index coming soon. This will be a read-only list of known entities with no rankings or endorsements.
              </p>
            </div>
          )}
        </section>

        {/* 4. How It Connects */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            How It Connects
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            How this category interacts with StrainSpotter AI features.
          </p>
          <div className="space-y-4">
            {category.connections.scanner && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Scanner</h3>
                <p className="text-sm text-gray-300">{category.connections.scanner}</p>
              </div>
            )}
            {category.connections.strainExplorer && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Strain Explorer</h3>
                <p className="text-sm text-gray-300">{category.connections.strainExplorer}</p>
              </div>
            )}
            {category.connections.garden && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Garden</h3>
                <p className="text-sm text-gray-300">{category.connections.garden}</p>
              </div>
            )}
            {category.connections.community && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Community</h3>
                <p className="text-sm text-gray-300">{category.connections.community}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

