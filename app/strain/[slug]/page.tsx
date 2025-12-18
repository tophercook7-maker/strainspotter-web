'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
}

export default function StrainDetailsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [strain, setStrain] = useState<StrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStrain() {
      try {
        const { data, error: fetchError } = await supabase
          .from('strains')
          .select('*')
          .eq('slug', slug)
          .single();

        if (fetchError) throw fetchError;
        setStrain(data);
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

