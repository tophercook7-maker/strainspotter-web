'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface ConfidenceAnalysis {
  confidence_level: 'low' | 'moderate' | 'high';
  agree: number;
  unsure: number;
  disagree: number;
}

interface ImageQualityAnalysis {
  image_quality: string;
  agree: number;
  unsure: number;
  disagree: number;
}

interface FeedbackAnalysis {
  by_confidence: ConfidenceAnalysis[];
  by_image_quality: ImageQualityAnalysis[];
  overall: {
    agree_rate: number;
    unsure_rate: number;
    disagree_rate: number;
  };
}

export default function FeedbackCalibrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null);
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

        // Load feedback analysis
        const response = await fetch('/api/internal/feedback/analysis');
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setError('Access denied. Admin access required.');
            setLoading(false);
            return;
          }
          throw new Error('Failed to load feedback analysis');
        }
        const data = await response.json();
        setAnalysis(data);
        setError(null);
      } catch (err: unknown) {
        console.error('[feedback-calibration] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load feedback analysis');
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
            <p>Loading feedback analysis...</p>
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

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400">No feedback data available yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Internal Feedback Calibration (Observational)</h1>
          <p className="text-gray-400 text-sm">
            Read-only analysis of user feedback signals. This dashboard is for internal observation only.
          </p>
        </div>

        {/* Overall Rates */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Overall Feedback Rates</h2>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  {(analysis.overall.agree_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Agree</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {(analysis.overall.unsure_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Unsure</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">
                  {(analysis.overall.disagree_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Disagree</div>
              </div>
            </div>
          </div>
        </section>

        {/* By Confidence Level */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Feedback by Confidence Level</h2>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Confidence Level</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-400">Agree</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-yellow-400">Unsure</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-400">Disagree</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {analysis.by_confidence.map((item, idx) => {
                  const total = item.agree + item.unsure + item.disagree;
                  return (
                    <tr key={idx} className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-sm capitalize">{item.confidence_level}</td>
                      <td className="text-right py-3 px-4 text-sm text-emerald-400">{item.agree}</td>
                      <td className="text-right py-3 px-4 text-sm text-yellow-400">{item.unsure}</td>
                      <td className="text-right py-3 px-4 text-sm text-red-400">{item.disagree}</td>
                      <td className="text-right py-3 px-4 text-sm">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* By Image Quality */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Feedback by Image Quality</h2>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Image Quality</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-400">Agree</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-yellow-400">Unsure</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-400">Disagree</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {analysis.by_image_quality.map((item, idx) => {
                  const total = item.agree + item.unsure + item.disagree;
                  return (
                    <tr key={idx} className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-sm capitalize">{item.image_quality || 'unknown'}</td>
                      <td className="text-right py-3 px-4 text-sm text-emerald-400">{item.agree}</td>
                      <td className="text-right py-3 px-4 text-sm text-yellow-400">{item.unsure}</td>
                      <td className="text-right py-3 px-4 text-sm text-red-400">{item.disagree}</td>
                      <td className="text-right py-3 px-4 text-sm">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

