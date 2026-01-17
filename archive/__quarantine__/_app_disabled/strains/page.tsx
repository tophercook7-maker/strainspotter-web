'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Strain = {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  aliases?: string[] | null;
};

type FilterType = 'all' | 'indica' | 'sativa' | 'hybrid';

export default function StrainsPage() {
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [scannerFilter, setScannerFilter] = useState<string>('all');

  useEffect(() => {
    async function loadStrains() {
      try {
        let query = supabase
          .from('strains')
          .select('id, name, slug, type, aliases')
          .order('name', { ascending: true });

        const { data, error } = await query;

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

    // Type filter
    if (typeFilter !== 'all') {
      const strainType = strain.type?.toLowerCase() || '';
      if (typeFilter === 'indica' && !strainType.includes('indica')) return false;
      if (typeFilter === 'sativa' && !strainType.includes('sativa')) return false;
      if (typeFilter === 'hybrid' && !strainType.includes('hybrid')) return false;
    }

    // Difficulty and scanner filters would require additional fields
    // For MVP, these are placeholders
    return true;
  });

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
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Strain Explorer</h1>
          <p className="text-gray-400">Factual strain reference and knowledge base</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as FilterType)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All</option>
                <option value="indica">Indica</option>
                <option value="sativa">Sativa</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Grow Difficulty</label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Scanner Confidence Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Scanner Data</label>
              <select
                value={scannerFilter}
                onChange={(e) => setScannerFilter(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              >
                <option value="all">All</option>
                <option value="available">Has Scanner Data</option>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStrains.map((strain) => (
              <Link
                key={strain.id}
                href={`/strains/${strain.slug}`}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-green-500/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{strain.name}</h3>
                {strain.type && (
                  <p className="text-sm text-gray-400 mb-1">{strain.type}</p>
                )}
                {strain.aliases && strain.aliases.length > 0 && (
                  <p className="text-xs text-gray-500">Also known as: {strain.aliases.join(', ')}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

