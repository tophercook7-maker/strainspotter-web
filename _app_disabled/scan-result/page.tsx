'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ImagePreview from '@/components/ImagePreview';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import MatchReasoning from '@/components/MatchReasoning';
import { getScan, getVisualMatch } from '@/lib/api';

interface MatchResult {
  name: string;
  slug: string;
  confidence: number;
  reasoning: string;
  breakdown: {
    color: number;
    text: number;
    label: number;
    web: number;
  };
}

function ScanResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);

  useEffect(() => {
    async function loadResult() {
      if (!scanId) {
        setError('No scan ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get scan record
        const scanData = await getScan(scanId);
        setScan(scanData);

        // Get visual match
        const matchData = await getVisualMatch(scanData.image_url, scanId);
        setMatchResult(matchData.match);
        setAlternatives(matchData.alternatives || []);
      } catch (err: any) {
        console.error('Error loading result:', err);
        setError(err.message || 'Failed to load scan result');
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [scanId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading scan result...</p>
        </div>
      </div>
    );
  }

  if (error || !scan || !matchResult) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error || 'Scan result not found'}</p>
          </div>
          <Link
            href="/scanner-upload"
            className="inline-block py-2 px-4 bg-green-500 text-black rounded-lg hover:bg-green-400 transition"
          >
            Try Another Scan
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
            href="/scanner-upload"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Scanner
          </Link>
          <h1 className="text-3xl font-bold">Scan Result</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Image */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Uploaded Image</h2>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              <ImagePreview src={scan.image_url} alt="Scanned image" className="w-full h-full" />
            </div>
          </div>

          {/* Right Column: Match Details */}
          <div className="space-y-6">
            {/* Best Match */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Best Match</h2>
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-green-200">{matchResult.name}</h3>
                  <p className="text-sm text-gray-400">Slug: {matchResult.slug}</p>
                </div>

                <ConfidenceBadge confidence={matchResult.confidence} size="lg" />

                <MatchReasoning reasoning={matchResult.reasoning} breakdown={matchResult.breakdown} />
              </div>
            </div>

            {/* Alternative Matches */}
            {alternatives.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Alternative Matches</h2>
                <div className="space-y-2">
                  {alternatives.map((alt, idx) => (
                    <Link
                      key={idx}
                      href={`/strain/${alt.slug}`}
                      className="block bg-gray-900 rounded-lg p-3 hover:bg-gray-800 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-green-200">{alt.name}</h4>
                          <p className="text-xs text-gray-400">{alt.reasoning}</p>
                        </div>
                        <div className="text-right">
                          <ConfidenceBadge confidence={alt.confidence} size="sm" showPercentage={true} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/scanner-upload"
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-400 text-black rounded-lg font-semibold hover:from-green-400 hover:to-emerald-300 transition"
          >
            Scan Another Image
          </Link>
          <Link
            href="/gallery"
            className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            View Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ScanResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ScanResultContent />
    </Suspense>
  );
}

