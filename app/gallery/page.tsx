'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImagePreview from '@/components/ImagePreview';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

interface ScanRecord {
  id: string;
  image_url: string;
  status: string;
  match_result?: {
    match: {
      name: string;
      slug: string;
      confidence: number;
    };
  };
  created_at: string;
}

export default function GalleryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function loadScans() {
      if (!authenticated) return;

      try {
        const response = await fetch('/api/scans?limit=50');
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error(errorData.error || 'Failed to load scans');
        }

        const data = await response.json();
        setScans(data.scans || []);
      } catch (err: any) {
        console.error('Error loading scans:', err);
        setError(err.message || 'Failed to load scans');
      } finally {
        setLoading(false);
      }
    }

    if (authenticated) {
      loadScans();
    }
  }, [authenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error}</p>
          </div>
          <button
            onClick={() => router.refresh()}
            className="px-6 py-3 bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/scanner"
            className="text-green-400 hover:text-green-300 mb-4 inline-block"
          >
            ← Back to Scanner
          </Link>
          <h1 className="text-3xl font-bold">Scan Gallery</h1>
          <p className="text-gray-400 mt-2">View all your past scans</p>
        </div>

        {/* Empty State */}
        {scans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No scans yet</p>
            <Link
              href="/scanner"
              className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-400 text-black rounded-lg font-semibold hover:from-green-400 hover:to-emerald-300 transition"
            >
              Take Your First Scan
            </Link>
          </div>
        )}

        {/* Grid */}
        {scans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {scans.map((scan) => {
              const match = scan.match_result?.match;
              return (
                <Link
                  key={scan.id}
                  href={`/scan/${scan.id}`}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition group"
                >
                  <div className="relative w-full aspect-square">
                    <ImagePreview src={scan.image_url} alt="Scan thumbnail" className="w-full h-full" />
                  </div>
                  <div className="p-4">
                    {match ? (
                      <>
                        <h3 className="font-semibold text-green-200 mb-2">{match.name}</h3>
                        <ConfidenceBadge confidence={match.confidence} size="sm" />
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-400 mb-2">Processing...</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
