'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { getStrainPrimaryImage } from '@/lib/strainImages';

interface SeedSource {
  breeder: string;
  seed_bank?: string;
  feminized?: boolean;
  autoflower?: boolean;
  regular?: boolean;
  link?: string;
  notes?: string;
}

interface StrainData {
  id: string;
  name: string;
  slug: string;
  type?: string;
  thc?: number;
  cbd?: number;
  terpenes?: Array<{ name: string; percentage?: number }>;
  description?: string;
  effects?: any;
  seed_sources?: SeedSource[];
  notes?: string; // For clone-only detection
}

export default function StrainDetailsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [strain, setStrain] = useState<StrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strainImage, setStrainImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function loadStrain() {
      try {
        // Explicitly select all fields including seed_sources
        const supabase = getSupabaseBrowserClient();
        const { data, error: fetchError } = await supabase
          .from('strains')
          .select('*, seed_sources')
          .eq('slug', slug)
          .single();

        if (fetchError) throw fetchError;
        
        // Log to verify seed_sources is present
        if (data) {
          console.log('[STRAIN PAGE] Loaded strain:', {
            name: data.name,
            slug: data.slug,
            hasSeedSources: !!data.seed_sources,
            seedSourcesType: typeof data.seed_sources,
            seedSourcesValue: data.seed_sources,
          });
        }
        
        // Ensure seed_sources is preserved (handle JSONB parsing if needed)
        const strainData = {
          ...data,
          seed_sources: data.seed_sources || null, // Preserve null/undefined, don't default to []
        };
        
        setStrain(strainData);

        // Load strain image
        try {
          const primaryImage = await getStrainPrimaryImage(slug);
          setStrainImage(primaryImage);
        } catch (err) {
          console.warn('[STRAIN PAGE] Failed to load strain image:', err);
          // Continue without image
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
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error || 'Strain not found'}</p>
          </div>
          <Link
            href="/gallery"
            className="inline-block py-2 px-4 bg-green-500 text-black rounded-lg hover:bg-green-400 transition"
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/gallery"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Gallery
          </Link>
          <h1 className="text-4xl font-bold">{strain.name}</h1>
          {strain.type && (
            <p className="text-gray-400 mt-2 capitalize">{strain.type}</p>
          )}
        </div>

        {/* Primary Strain Image */}
        {strainImage && !imageError && (
          <div className="mb-6">
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

        {/* Placeholder if no image */}
        {!strainImage && !loading && (
          <div className="mb-6">
            <div className="relative w-full max-w-2xl aspect-square rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
              <span className="text-gray-500 text-sm">No image available</span>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* THC/CBD */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Cannabinoids</h2>
            <div className="space-y-2">
              {strain.thc !== undefined && (
                <div>
                  <span className="text-gray-400">THC: </span>
                  <span className="text-green-200 font-semibold">{strain.thc}%</span>
                </div>
              )}
              {strain.cbd !== undefined && (
                <div>
                  <span className="text-gray-400">CBD: </span>
                  <span className="text-green-200 font-semibold">{strain.cbd}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Terpenes */}
          {strain.terpenes && strain.terpenes.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-3">Terpenes</h2>
              <div className="flex flex-wrap gap-2">
                {strain.terpenes.map((terpene, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-500/20 text-green-200 rounded-full text-sm"
                  >
                    {terpene.name}
                    {terpene.percentage && ` (${terpene.percentage}%)`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {strain.description && (
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-gray-300">{strain.description}</p>
          </div>
        )}

        {/* Seeds Section */}
        <SeedsSection strain={strain} />

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/scanner-upload"
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-400 text-black rounded-lg font-semibold hover:from-green-400 hover:to-emerald-300 transition"
          >
            Scan This Strain
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Seeds Section Component
 * Displays seed sources for the strain
 */
function SeedsSection({ strain }: { strain: StrainData }) {
  // Check if strain is clone-only (check notes or description for "clone-only")
  const notesText = typeof strain.notes === 'string' ? strain.notes.toLowerCase() : '';
  const descText = typeof strain.description === 'string' ? strain.description.toLowerCase() : '';
  const isCloneOnly = notesText.includes('clone-only') || descText.includes('clone-only');

  // Handle clone-only case
  if (isCloneOnly) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span>🌱</span>
          <span>Seeds</span>
        </h2>
        <p className="text-gray-300">
          This strain is clone-only. No commercial seed source exists.
        </p>
      </div>
    );
  }

  // Handle missing or empty seed_sources
  if (!strain.seed_sources || strain.seed_sources.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <span>🌱</span>
          <span>Seeds</span>
        </h2>
        <p className="text-gray-300">
          Seed availability unknown.
        </p>
      </div>
    );
  }

  // Render seed sources
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span>🌱</span>
        <span>Seeds</span>
      </h2>
      <div className="space-y-4">
        {strain.seed_sources.map((source, index) => {
          // Skip if breeder is missing (required field)
          if (!source.breeder || typeof source.breeder !== 'string') {
            return null;
          }

          return (
            <div
              key={index}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex flex-col gap-3">
                {/* Breeder (required) */}
                <div>
                  <span className="text-gray-400 text-sm">Breeder: </span>
                  <span className="text-white font-semibold">{source.breeder}</span>
                </div>

              {/* Seed Bank (optional) */}
              {source.seed_bank && (
                <div>
                  <span className="text-gray-400 text-sm">Seed Bank: </span>
                  <span className="text-white">{source.seed_bank}</span>
                </div>
              )}

              {/* Type Badges */}
              {(source.feminized || source.autoflower || source.regular) && (
                <div className="flex flex-wrap gap-2">
                  {source.feminized && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-200 rounded text-xs font-medium">
                      Feminized
                    </span>
                  )}
                  {source.autoflower && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-200 rounded text-xs font-medium">
                      Autoflower
                    </span>
                  )}
                  {source.regular && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-200 rounded text-xs font-medium">
                      Regular
                    </span>
                  )}
                </div>
              )}

              {/* Notes (optional) */}
              {source.notes && (
                <div>
                  <p className="text-gray-300 text-sm">{source.notes}</p>
                </div>
              )}

              {/* External Link (optional) */}
              {source.link && (
                <div>
                  <a
                    href={source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition text-sm"
                  >
                    View Seed Bank →
                  </a>
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

