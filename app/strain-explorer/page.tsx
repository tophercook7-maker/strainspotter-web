'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const sampleHighlights = [
  { name: 'Limonene', note: 'Often described as bright and citrus-forward.' },
  { name: 'Myrcene', note: 'Commonly associated with earthy, calm profiles.' },
  { name: 'Caryophyllene', note: 'Typically reported as peppery with balanced mood notes.' },
];

export default function StrainExplorerPage() {
  const params = useSearchParams();
  const slug = params.get('slug');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Strain Explorer</h1>
            <p className="text-sm text-slate-300/80">A read-only library of strain information, effects, and terpene highlights.</p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Name</h2>
            <p className="text-sm text-slate-300/80">{slug ? slug.replace(/-/g, ' ') : 'Select a strain to explore.'}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200">Effects</h3>
            <p className="text-sm text-slate-300/80">
              Often described as balanced focus with gentle relaxation; commonly associated with evening journaling or calm creative sessions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Terpene highlights</h3>
            <div className="space-y-2">
              {sampleHighlights.map((t) => (
                <div key={t.name} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-200 border border-emerald-500/20 text-xs">
                    {t.name}
                  </span>
                  <span className="text-slate-300/80">{t.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/garden"
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border border-slate-700 hover:border-emerald-400/50"
            >
              Back to Garden
            </Link>
            {slug && (
              <Link
                href={`/strain/${slug}`}
                className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
              >
                Open full details
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const sampleHighlights = [
  { name: 'Limonene', note: 'Bright citrus; uplifting and focus-friendly.' },
  { name: 'Myrcene', note: 'Earthy and soothing; often linked to calm body feel.' },
  { name: 'Caryophyllene', note: 'Peppery bite; pairs with balanced mood support.' },
];

export default function StrainExplorerPage() {
  const params = useSearchParams();
  const slug = params.get('slug');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Strain Explorer</h1>
            <p className="text-sm text-slate-300/80">Read-only snapshots of strains: effects and terpene highlights.</p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Name</h2>
            <p className="text-sm text-slate-300/80">{slug ? slug.replace(/-/g, ' ') : 'Select a strain to explore.'}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200">Effects</h3>
            <p className="text-sm text-slate-300/80">
              Balanced focus with gentle relaxation. Suitable for evening journaling or light creative sessions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Terpene highlights</h3>
            <div className="space-y-2">
              {sampleHighlights.map((t) => (
                <div key={t.name} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-200 border border-emerald-500/20 text-xs">
                    {t.name}
                  </span>
                  <span className="text-slate-300/80">{t.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/garden"
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-100 text-sm border border-slate-700 hover:border-emerald-400/50"
            >
              Back to Garden
            </Link>
            {slug && (
              <Link
                href={`/strain/${slug}`}
                className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
              >
                Open full details
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
/**
 * Strain Explorer
 * Neutral, factual cannabis reference system.
 * Not a marketplace. Not reviews. Not hype.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Strain = {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  aliases?: string[] | null;
  terpenes?: any;
};

type FilterType = 'all' | 'indica' | 'sativa' | 'hybrid';
type FlowerType = 'all' | 'bud' | 'live' | 'concentrate' | 'edible';

export default function StrainExplorerPage() {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [geneticsFilter, setGeneticsFilter] = useState<FilterType>('all');
  const [flowerTypeFilter, setFlowerTypeFilter] = useState<FlowerType>('all');
  const [thcMin, setThcMin] = useState('');
  const [thcMax, setThcMax] = useState('');
  const [hasCbd, setHasCbd] = useState<string>('all');

  useEffect(() => {
    async function loadStrains() {
      try {
        const { data, error } = await supabase
          .from('strains')
          .select('id, name, slug, type, aliases, terpenes')
          .order('name', { ascending: true });

        if (error) throw error;
        setStrains(data || []);
      } catch (err: any) {
        console.error('Error loading strains:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStrains();
  }, []);

  const filteredStrains = strains.filter((strain) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = strain.name.toLowerCase().includes(query);
      const matchesAliases = strain.aliases?.some(alias => 
        alias.toLowerCase().includes(query)
      ) || false;
      if (!matchesName && !matchesAliases) return false;
    }

    // Genetics filter
    if (geneticsFilter !== 'all') {
      const strainType = strain.type?.toLowerCase() || '';
      if (geneticsFilter === 'indica' && !strainType.includes('indica')) return false;
      if (geneticsFilter === 'sativa' && !strainType.includes('sativa')) return false;
      if (geneticsFilter === 'hybrid' && !strainType.includes('hybrid')) return false;
    }

    // Flower type, THC, CBD filters would require additional fields
    // For MVP structure, these are placeholders
    return true;
  });

  // Get dominant terpenes from strain data
  const getDominantTerpenes = (strain: Strain): string[] => {
    if (!strain.terpenes) return [];
    // If terpenes is an object with properties, extract dominant ones
    if (typeof strain.terpenes === 'object' && !Array.isArray(strain.terpenes)) {
      return Object.keys(strain.terpenes).slice(0, 3);
    }
    // If terpenes is an array
    if (Array.isArray(strain.terpenes)) {
      return strain.terpenes.slice(0, 3);
    }
    return [];
  };

  // Get data confidence (placeholder - would come from scanner correlation data)
  const getDataConfidence = (strain: Strain): 'Low' | 'Medium' | 'High' => {
    // Placeholder logic - in real implementation, this would check scanner correlation data
    return 'Medium';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading strains...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-white mb-2">Strain Explorer</h1>
          <p className="text-gray-400">Factual cannabis genetics and phenotype reference</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by strain name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
          />
        </div>

        {/* Filter Row */}
        <div className="mb-12 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Genetics Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Genetics</label>
              <select
                value={geneticsFilter}
                onChange={(e) => setGeneticsFilter(e.target.value as FilterType)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors"
              >
                <option value="all">All</option>
                <option value="indica">Indica</option>
                <option value="sativa">Sativa</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Flower Type Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Flower Type</label>
              <select
                value={flowerTypeFilter}
                onChange={(e) => setFlowerTypeFilter(e.target.value as FlowerType)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors"
              >
                <option value="all">All</option>
                <option value="bud">Bud</option>
                <option value="live">Live</option>
                <option value="concentrate">Concentrate</option>
                <option value="edible">Edible</option>
              </select>
            </div>

            {/* THC Range */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">THC Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={thcMin}
                  onChange={(e) => setThcMin(e.target.value)}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={thcMax}
                  onChange={(e) => setThcMax(e.target.value)}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* CBD Presence */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">CBD</label>
              <select
                value={hasCbd}
                onChange={(e) => setHasCbd(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors"
              >
                <option value="all">All</option>
                <option value="yes">Has CBD</option>
                <option value="no">No CBD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-gray-400 text-sm">
          {filteredStrains.length} {filteredStrains.length === 1 ? 'strain' : 'strains'}
        </div>

        {/* Strain Grid */}
        {filteredStrains.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No strains found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStrains.map((strain) => {
              const terpenes = getDominantTerpenes(strain);
              const confidence = getDataConfidence(strain);
              const confidenceColors = {
                High: 'bg-green-500/20 text-green-400 border-green-500/50',
                Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
                Low: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
              };

              return (
                <Link
                  key={strain.id}
                  href={`/strain/${strain.slug}`}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-green-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{strain.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${confidenceColors[confidence]}`}>
                      {confidence}
                    </span>
                  </div>
                  
                  {strain.type && (
                    <p className="text-sm text-gray-400 mb-3">{strain.type}</p>
                  )}
                  
                  {terpenes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Dominant terpenes:</p>
                      <p className="text-sm text-gray-400">{terpenes.join(', ')}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

