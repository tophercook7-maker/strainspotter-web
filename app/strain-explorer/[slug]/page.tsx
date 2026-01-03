/**
 * Strain Explorer Detail Page
 * Neutral, factual cannabis reference.
 * 7 sections in exact order per spec.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Strain = {
  id: string;
  name: string;
  slug: string;
  aliases?: string[] | null;
  type?: string | null;
  description?: string | null;
  lineage?: any;
  breeder?: string | null;
  parent_strains?: string[] | null;
  phenotype?: any;
  grow_guide?: any;
  effects?: any;
  terpenes?: any;
  thc?: number | null;
  cbd?: number | null;
};

export default function StrainExplorerDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [strain, setStrain] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadStrain() {
      try {
        const { data, error: fetchError } = await supabase
          .from('strains')
          .select('*')
          .eq('slug', slug)
          .maybeSingle<Strain>();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setError('Strain not found');
          setLoading(false);
          return;
        }
        
        setStrain(data);

        // Load scanner correlation count (placeholder - would aggregate from scans)
        // For now, this is a placeholder query
        try {
          // TODO: Aggregate scan matches for this strain
          // For MVP structure, set to null (unknown)
          setScanCount(null);
        } catch (err) {
          console.warn('[STRAIN EXPLORER] Failed to load scan correlation:', err);
        }
      } catch (err: any) {
        console.error('Error loading strain:', err);
        setError(err.message || 'Failed to load strain');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadStrain();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading strain details...</p>
        </div>
      </div>
    );
  }

  if (error || !strain) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error || 'Strain not found'}</p>
          </div>
          <Link
            href="/strain-explorer"
            className="inline-block py-2 px-4 bg-green-500 text-black rounded-lg hover:bg-green-400 transition"
          >
            Back to Strain Explorer
          </Link>
        </div>
      </div>
    );
  }

  // Get data confidence indicator (placeholder)
  const getDataConfidence = (): 'Low' | 'Medium' | 'High' => {
    // Placeholder - would check data completeness
    return 'Medium';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/strain-explorer"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Strain Explorer
          </Link>
        </div>

        {/* 1. OVERVIEW */}
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-4">{strain.name}</h1>
          
          {strain.aliases && strain.aliases.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400">
                Also known as: {strain.aliases.join(', ')}
              </p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-lg text-gray-300">
              Genetic classification: {strain.type || 'Unknown'}
            </p>
          </div>

          {strain.description ? (
            <p className="text-gray-300 leading-relaxed max-w-3xl mb-4">
              {strain.description}
            </p>
          ) : (
            <p className="text-gray-500 italic mb-4">Description not available.</p>
          )}

          <div className="mt-4">
            <span className="text-sm text-gray-400">Data confidence: </span>
            <span className="text-sm text-gray-300">{getDataConfidence()}</span>
          </div>
        </section>

        {/* 2. GENETICS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Genetics
          </h2>
          
          {strain.parent_strains && strain.parent_strains.length > 0 ? (
            <div className="space-y-2 mb-4">
              <p className="text-gray-300 mb-2">Parent strains:</p>
              <div className="flex flex-wrap gap-2">
                {strain.parent_strains.map((parent, idx) => {
                  // Generate slug from parent name
                  const parentSlug = parent.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <Link
                      key={idx}
                      href={`/strain-explorer/${parentSlug}`}
                      className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-green-400 hover:border-green-500 transition"
                    >
                      {parent}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 mb-4">Parent strains: Unknown</p>
          )}

          {strain.breeder ? (
            <div className="mb-4">
              <p className="text-gray-300">
                <span className="text-gray-400">Breeder: </span>
                {strain.breeder}
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-gray-500">Breeder: Unknown</p>
            </div>
          )}

          {strain.lineage ? (
            <div className="mb-4">
              <p className="text-gray-300">
                <span className="text-gray-400">Origin notes: </span>
                {typeof strain.lineage === 'string' ? strain.lineage : JSON.stringify(strain.lineage)}
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-gray-500">Origin notes: Unknown</p>
            </div>
          )}
        </section>

        {/* 3. OBSERVED PHENOTYPE PATTERNS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Observed Phenotype Patterns
          </h2>

          {strain.phenotype ? (
            <div className="space-y-3 text-gray-300">
              {typeof strain.phenotype === 'object' ? (
                <>
                  {strain.phenotype.structure && (
                    <p><span className="text-gray-400">Growth structure: </span>{strain.phenotype.structure}</p>
                  )}
                  {strain.phenotype.bud_density && (
                    <p><span className="text-gray-400">Flower density: </span>{strain.phenotype.bud_density}</p>
                  )}
                  {strain.phenotype.color_tendencies && (
                    <p><span className="text-gray-400">Color variation: </span>{strain.phenotype.color_tendencies}</p>
                  )}
                  {strain.phenotype.trichome_visibility && (
                    <p><span className="text-gray-400">Common visual markers: </span>{strain.phenotype.trichome_visibility}</p>
                  )}
                </>
              ) : (
                <p>{String(strain.phenotype)}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Phenotype data not available.</p>
          )}
        </section>

        {/* 4. OBSERVED EFFECTS (CROWD-OBSERVED) */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Observed Effects
          </h2>
          <p className="text-sm text-gray-400 mb-4 italic">
            Crowd-observed effects (community observations)
          </p>
          <p className="text-xs text-gray-500 mb-4">
            No ratings, only frequency labels: Common / Occasional / Rare
          </p>

          {strain.effects ? (
            <div className="space-y-2 text-gray-300">
              {typeof strain.effects === 'object' ? (
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(strain.effects).map(([key, value]) => {
                    // Format effect name
                    const effectName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                      <li key={key}>
                        <span className="text-gray-400">{effectName}: </span>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>{String(strain.effects)}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Effects data not available.</p>
          )}
        </section>

        {/* 5. TERPENE PROFILE */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Terpene Profile
          </h2>

          {strain.terpenes ? (
            <div className="space-y-3 text-gray-300">
              {typeof strain.terpenes === 'object' && !Array.isArray(strain.terpenes) ? (
                <>
                  <div>
                    <p className="text-gray-400 mb-2">Dominant terpenes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.keys(strain.terpenes).slice(0, 3).map((terpene) => (
                        <li key={terpene}>{terpene}</li>
                      ))}
                    </ul>
                  </div>
                  {Object.keys(strain.terpenes).length > 3 && (
                    <div>
                      <p className="text-gray-400 mb-2">Secondary terpenes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {Object.keys(strain.terpenes).slice(3).map((terpene) => (
                          <li key={terpene}>{terpene}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : Array.isArray(strain.terpenes) ? (
                <>
                  <div>
                    <p className="text-gray-400 mb-2">Dominant terpenes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {strain.terpenes.slice(0, 3).map((terpene, idx) => (
                        <li key={idx}>{String(terpene)}</li>
                      ))}
                    </ul>
                  </div>
                  {strain.terpenes.length > 3 && (
                    <div>
                      <p className="text-gray-400 mb-2">Secondary terpenes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {strain.terpenes.slice(3).map((terpene, idx) => (
                          <li key={idx}>{String(terpene)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p>{String(strain.terpenes)}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Terpene data: Unknown</p>
          )}
        </section>

        {/* 6. GROW CHARACTERISTICS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Grow Characteristics
          </h2>

          {strain.grow_guide ? (
            <div className="space-y-3 text-gray-300">
              {typeof strain.grow_guide === 'object' ? (
                <>
                  {strain.grow_guide.suitability && (
                    <p><span className="text-gray-400">Indoor / Outdoor suitability: </span>{strain.grow_guide.suitability}</p>
                  )}
                  {strain.grow_guide.flowering_time && (
                    <p><span className="text-gray-400">Flowering time: </span>{strain.grow_guide.flowering_time}</p>
                  )}
                  {strain.grow_guide.difficulty ? (
                    <p><span className="text-gray-400">Difficulty: </span>{strain.grow_guide.difficulty}</p>
                  ) : (
                    <p className="text-gray-500">Difficulty: Unknown</p>
                  )}
                  {strain.grow_guide.sensitivities && (
                    <p><span className="text-gray-400">Known sensitivities: </span>{strain.grow_guide.sensitivities}</p>
                  )}
                  {strain.grow_guide.climate_preferences && (
                    <p><span className="text-gray-400">Climate preferences: </span>{strain.grow_guide.climate_preferences}</p>
                  )}
                </>
              ) : (
                <p>{String(strain.grow_guide)}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-gray-500">
              <p>Indoor / Outdoor suitability: Unknown</p>
              <p>Flowering time: Unknown</p>
              <p>Difficulty: Unknown</p>
            </div>
          )}
        </section>

        {/* 7. SCANNER CORRELATION */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Scanner Correlation
          </h2>
          <p className="text-sm text-gray-400 mb-4 italic">
            Scanner has identified similar patterns in scans (read-only aggregation)
          </p>

          {scanCount !== null ? (
            <div className="space-y-2 text-gray-300">
              <p>
                Scanner has identified similar patterns in <strong>{scanCount}</strong> scans.
              </p>
              <p className="text-sm text-gray-400">
                Confidence level: {getDataConfidence()}
              </p>
              <p className="text-xs text-gray-500 mt-4">
                No claim of certainty. Scanner data is observational only.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-gray-500">
              <p>Scanner correlation data: Unknown</p>
              <p className="text-xs text-gray-600 mt-4">
                Scanner correlation data not yet available for this strain.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

