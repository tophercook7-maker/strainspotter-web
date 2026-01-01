'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface ConfidenceData {
  time_series: Array<{ date: string; avg_confidence: number }>;
  by_image_quality: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
}

interface PhenotypeData {
  top_signatures: Array<{
    phenotype_signature: any;
    occurrence_count: number;
    last_seen: string;
  }>;
  emerging_signatures: Array<{
    phenotype_signature: any;
    growth_rate: number;
  }>;
}

export default function TrendsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);
  const [phenotypeData, setPhenotypeData] = useState<PhenotypeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        setAuthenticated(true);

        // Load confidence trends
        const confidenceResponse = await fetch('/api/internal/trends/confidence');
        if (!confidenceResponse.ok) {
          if (confidenceResponse.status === 401 || confidenceResponse.status === 403) {
            setError('Access denied. Admin access required.');
            setLoading(false);
            return;
          }
          throw new Error('Failed to load confidence trends');
        }
        const confidence = await confidenceResponse.json();
        setConfidenceData(confidence);

        // Load phenotype trends
        const phenotypeResponse = await fetch('/api/internal/trends/phenotypes');
        if (!phenotypeResponse.ok) {
          if (phenotypeResponse.status === 401 || phenotypeResponse.status === 403) {
            setError('Access denied. Admin access required.');
            setLoading(false);
            return;
          }
          throw new Error('Failed to load phenotype trends');
        }
        const phenotype = await phenotypeResponse.json();
        setPhenotypeData(phenotype);

        setError(null);
      } catch (err: any) {
        console.error('[trends-dashboard] Error:', err);
        setError(err.message || 'Failed to load trend data');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoad();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading trend data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Internal Observational Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Read-only trend analysis. This dashboard is for internal observation only.
          </p>
        </div>

        {/* Confidence Trends */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Confidence Trends</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Time Series */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Average Confidence Over Time</h3>
              {confidenceData?.time_series && confidenceData.time_series.length > 0 ? (
                <div className="space-y-2">
                  {confidenceData.time_series.slice(-10).map((point, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{point.date}</span>
                      <span className="font-mono">
                        {(point.avg_confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No data available</p>
              )}
            </div>

            {/* By Image Quality */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Average Confidence by Image Quality</h3>
              {confidenceData?.by_image_quality ? (
                <div className="space-y-3">
                  {Object.entries(confidenceData.by_image_quality).map(([quality, avg]) => (
                    <div key={quality} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{quality}</span>
                      <span className="font-mono">
                        {(avg * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No data available</p>
              )}
            </div>
          </div>
        </section>

        {/* Phenotype Trends */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Phenotype Trends</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Signatures */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Top Phenotype Signatures</h3>
              {phenotypeData?.top_signatures && phenotypeData.top_signatures.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {phenotypeData.top_signatures.map((sig, idx) => (
                    <div key={idx} className="border-b border-gray-700 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">#{idx + 1}</span>
                        <span className="text-sm text-gray-400">
                          {sig.occurrence_count} occurrences
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono bg-gray-900 p-2 rounded">
                        {JSON.stringify(sig.phenotype_signature, null, 2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last seen: {new Date(sig.last_seen).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No data available</p>
              )}
            </div>

            {/* Emerging Signatures */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Emerging Phenotype Signatures</h3>
              {phenotypeData?.emerging_signatures && phenotypeData.emerging_signatures.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {phenotypeData.emerging_signatures.map((sig, idx) => (
                    <div key={idx} className="border-b border-gray-700 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">#{idx + 1}</span>
                        <span className="text-sm text-green-400">
                          {sig.growth_rate.toFixed(2)} occurrences/day
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono bg-gray-900 p-2 rounded">
                        {JSON.stringify(sig.phenotype_signature, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No emerging signatures</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

