'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getStrainPrimaryImage } from '@/lib/strainImages';

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
  seed_sources?: unknown | null;
};

export default function StrainExplorerDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [strain, setStrain] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strainImage, setStrainImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

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

        // Load strain image
        try {
          const primaryImage = await getStrainPrimaryImage(slug);
          setStrainImage(primaryImage);
        } catch (err) {
          console.warn('[STRAIN EXPLORER] Failed to load strain image:', err);
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
            href="/strains"
            className="inline-block py-2 px-4 bg-green-500 text-black rounded-lg hover:bg-green-400 transition"
          >
            Back to Strain Explorer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/strains"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Strain Explorer
          </Link>
        </div>

        {/* 1. STRAIN OVERVIEW */}
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
              Classification: {strain.type || 'Unknown'}
            </p>
          </div>

          {strain.description ? (
            <p className="text-gray-300 leading-relaxed max-w-3xl">
              {strain.description}
            </p>
          ) : (
            <p className="text-gray-500 italic">Description not available.</p>
          )}
        </section>

        {/* Primary Strain Image */}
        {strainImage && !imageError && (
          <div className="mb-12">
            <div className="relative w-full max-w-2xl aspect-square rounded-lg overflow-hidden bg-gray-900">
              <img
                src={strainImage}
                alt={strain.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* 2. GENETICS & LINEAGE */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Genetics & Lineage
          </h2>
          
          {strain.parent_strains && strain.parent_strains.length > 0 ? (
            <div className="space-y-2">
              <p className="text-gray-300 mb-2">Parent strains:</p>
              <div className="flex flex-wrap gap-2">
                {strain.parent_strains.map((parent, idx) => (
                  <Link
                    key={idx}
                    href={`/strains/${parent.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-green-400 hover:border-green-500 transition"
                  >
                    {parent}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unknown</p>
          )}

          {strain.breeder ? (
            <div className="mt-4">
              <p className="text-gray-300">
                <span className="text-gray-400">Breeder: </span>
                {strain.breeder}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-gray-500">Breeder: Unknown</p>
            </div>
          )}

          {strain.lineage ? (
            <div className="mt-4">
              <p className="text-gray-300">
                <span className="text-gray-400">Genetic origin: </span>
                {typeof strain.lineage === 'string' ? strain.lineage : JSON.stringify(strain.lineage)}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-gray-500">Genetic origin: Unknown</p>
            </div>
          )}
        </section>

        {/* 3. PHENOTYPE PROFILE */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Phenotype Profile
          </h2>
          <p className="text-sm text-gray-400 mb-4 italic">
            Observed physical traits — NOT promises
          </p>

          {strain.phenotype ? (
            <div className="space-y-3 text-gray-300">
              {typeof strain.phenotype === 'object' ? (
                <>
                  {strain.phenotype.structure && (
                    <p><span className="text-gray-400">Typical structure: </span>{strain.phenotype.structure}</p>
                  )}
                  {strain.phenotype.bud_density && (
                    <p><span className="text-gray-400">Bud density: </span>{strain.phenotype.bud_density}</p>
                  )}
                  {strain.phenotype.color_tendencies && (
                    <p><span className="text-gray-400">Color tendencies: </span>{strain.phenotype.color_tendencies}</p>
                  )}
                  {strain.phenotype.trichome_visibility && (
                    <p><span className="text-gray-400">Trichome visibility: </span>{strain.phenotype.trichome_visibility}</p>
                  )}
                  {strain.phenotype.flowering_time && (
                    <p><span className="text-gray-400">Flowering time: </span>{strain.phenotype.flowering_time}</p>
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

        {/* 4. GROW INSIGHTS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Grow Insights
          </h2>
          <p className="text-sm text-gray-400 mb-4 italic">
            Purely practical observations
          </p>

          {strain.grow_guide ? (
            <div className="space-y-3 text-gray-300">
              {typeof strain.grow_guide === 'object' ? (
                <>
                  {strain.grow_guide.suitability && (
                    <p><span className="text-gray-400">Suitability: </span>{strain.grow_guide.suitability}</p>
                  )}
                  {strain.grow_guide.difficulty && (
                    <p><span className="text-gray-400">Difficulty: </span>{strain.grow_guide.difficulty}</p>
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
            <p className="text-gray-500">Grow insights not available.</p>
          )}
        </section>

        {/* 5. OBSERVED EFFECTS */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Observed Effects
          </h2>
          <p className="text-sm text-gray-400 mb-4 italic">
            Commonly reported effects (community observations)
          </p>
          <p className="text-xs text-gray-500 mb-4">
            No medical claims. No promises. No dosages.
          </p>

          {strain.effects ? (
            <div className="space-y-2 text-gray-300">
              {typeof strain.effects === 'object' ? (
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(strain.effects).map(([key, value]) => (
                    <li key={key}>
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      {typeof value === 'number' && `: ${value}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{String(strain.effects)}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Effect observations not available.</p>
          )}
        </section>

        {/* 6. SCANNER CORRELATION */}
        <ScannerCorrelationSection slug={strain.slug} />

        {/* 7. COMMUNITY NOTES */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
            Community Notes
          </h2>
          <p className="text-sm text-gray-400 mb-4 italic">
            Structured observations only — NOT reviews
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <p className="text-gray-500 text-sm">
              Community notes feature coming soon. Notes will be moderated and factual only.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Scanner Correlation Section
 * Shows aggregated scanner confidence over time
 */
function ScannerCorrelationSection({ slug }: { slug: string }) {
  // TODO: Query scan history for this strain and aggregate confidence levels
  // For now, show placeholder that explains what this section will show
  
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-4 border-b border-gray-800 pb-2">
        Scanner Correlation
      </h2>
      <p className="text-sm text-gray-400 mb-4 italic">
        Visual and phenotypic alignment with scanner results
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <p className="text-gray-300 mb-2">
              Scanner correlation: <span className="text-gray-500">Data not available</span>
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Scanner correlation reflects how consistently this strain matches across scan results over time.
            </p>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-semibold text-white mb-2">What this means:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              <li><strong>High:</strong> Visual traits and phenotype align consistently across scans</li>
              <li><strong>Medium:</strong> Strong phenotype alignment with some variation</li>
              <li><strong>Low:</strong> Visual traits overlap many strains or limited scan data</li>
            </ul>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500">
              Scanner correlation is calculated from actual scan results and visual matching algorithms. 
              Correlation data improves as more scans are processed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

