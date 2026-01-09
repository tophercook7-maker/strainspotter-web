'use client';

/**
 * Shadow Model Promotion Readiness Dashboard
 * Admin-only, read-only view of A/B test comparison data
 * Does NOT promote any model
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAlert {
  alert_id: string;
  alert_type: string;
  severity: 'info' | 'warning';
  message: string;
  metrics?: Record<string, unknown>;
  created_at: string;
}

interface OverallMetrics {
  total_comparisons: number;
  shadow_better_rate: number;
  shadow_worse_rate: number;
  neutral_rate: number;
}

interface MetricBreakdown {
  improved: number;
  regressed: number;
  neutral: number;
}

interface ByMetric {
  confidence_alignment: MetricBreakdown;
  phenotype_agreement: MetricBreakdown;
  similarity_score: MetricBreakdown;
}

interface Recommendation {
  status: 'not_ready' | 'borderline' | 'ready';
  reason: string;
}

interface ReadinessData {
  overall: OverallMetrics;
  by_metric: ByMetric;
  recommendation: Recommendation;
}

export default function ModelReadinessPage() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [readinessRes, alertsRes] = await Promise.all([
          fetch('/api/internal/model/readiness'),
          fetch('/api/internal/canary-alerts?limit=5'),
        ]);

        if (readinessRes.status === 403 || alertsRes.status === 403) {
          router.push('/garden'); // Redirect non-admins
          return;
        }
        if (readinessRes.status === 401 || alertsRes.status === 401) {
          router.push('/login'); // Redirect unauthenticated
          return;
        }

        if (!readinessRes.ok) {
          throw new Error('Failed to fetch readiness data');
        }

        const readinessData = await readinessRes.json();
        setData(readinessData);

        // Alerts are optional - don't fail if they can't be fetched
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.alerts || []);
        }
      } catch (err: unknown) {
        console.error('Error fetching readiness data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-lg">Loading readiness data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-lg text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-lg text-gray-400">No readiness data available.</p>
        </div>
      </div>
    );
  }

  const { overall, by_metric, recommendation } = data;

  // Determine recommendation banner color
  const recommendationColor = 
    recommendation.status === 'ready' ? 'bg-emerald-900/30 border-emerald-500' :
    recommendation.status === 'borderline' ? 'bg-amber-900/30 border-amber-500' :
    'bg-red-900/30 border-red-500';

  const recommendationTextColor = 
    recommendation.status === 'ready' ? 'text-emerald-300' :
    recommendation.status === 'borderline' ? 'text-amber-300' :
    'text-red-300';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Shadow Model Promotion Readiness</h1>
          <p className="text-gray-400">
            Observational dashboard for A/B test comparison data. No model promotion occurs automatically.
          </p>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className={`rounded-lg border-2 p-4 ${
                  alert.severity === 'warning'
                    ? 'bg-red-900/30 border-red-500'
                    : 'bg-blue-900/30 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-xl ${
                    alert.severity === 'warning' ? 'text-red-300' : 'text-blue-300'
                  }`}>
                    {alert.severity === 'warning' ? '⚠' : 'ℹ'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation Banner */}
        <div className={`rounded-lg border-2 p-4 ${recommendationColor}`}>
          <div className="flex items-start gap-3">
            <div className={`text-2xl ${recommendationTextColor}`}>
              {recommendation.status === 'ready' ? '✓' : 
               recommendation.status === 'borderline' ? '⚠' : '✗'}
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-semibold mb-1 ${recommendationTextColor}`}>
                Status: {recommendation.status.toUpperCase().replace('_', ' ')}
              </h2>
              <p className="text-gray-300">{recommendation.reason}</p>
              <p className="text-sm text-gray-400 mt-2 italic">
                This is an observational assessment only. No model promotion occurs automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Overall Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Total Comparisons</p>
              <p className="text-2xl font-bold">{overall.total_comparisons}</p>
            </div>
            <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700">
              <p className="text-sm text-emerald-300 mb-1">Shadow Better</p>
              <p className="text-2xl font-bold text-emerald-300">
                {(overall.shadow_better_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-red-900/20 rounded-lg p-4 border border-red-700">
              <p className="text-sm text-red-300 mb-1">Shadow Worse</p>
              <p className="text-2xl font-bold text-red-300">
                {(overall.shadow_worse_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Neutral</p>
              <p className="text-2xl font-bold">
                {(overall.neutral_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </section>

        {/* Metric Breakdown Tables */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Metric Breakdown</h2>
          <div className="space-y-6">
            {/* Confidence Alignment */}
            <div>
              <h3 className="text-lg font-medium mb-2">Confidence Alignment</h3>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-sm text-emerald-300">Improved</td>
                      <td className="px-4 py-2 text-sm">{by_metric.confidence_alignment.improved}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.confidence_alignment.improved / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-red-300">Regressed</td>
                      <td className="px-4 py-2 text-sm">{by_metric.confidence_alignment.regressed}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.confidence_alignment.regressed / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-300">Neutral</td>
                      <td className="px-4 py-2 text-sm">{by_metric.confidence_alignment.neutral}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.confidence_alignment.neutral / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phenotype Agreement */}
            <div>
              <h3 className="text-lg font-medium mb-2">Phenotype Agreement</h3>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-sm text-emerald-300">Improved</td>
                      <td className="px-4 py-2 text-sm">{by_metric.phenotype_agreement.improved}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.phenotype_agreement.improved / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-red-300">Regressed</td>
                      <td className="px-4 py-2 text-sm">{by_metric.phenotype_agreement.regressed}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.phenotype_agreement.regressed / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-300">Neutral</td>
                      <td className="px-4 py-2 text-sm">{by_metric.phenotype_agreement.neutral}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.phenotype_agreement.neutral / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Similarity Score */}
            <div>
              <h3 className="text-lg font-medium mb-2">Similarity Score</h3>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-sm text-emerald-300">Improved</td>
                      <td className="px-4 py-2 text-sm">{by_metric.similarity_score.improved}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.similarity_score.improved / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-red-300">Regressed</td>
                      <td className="px-4 py-2 text-sm">{by_metric.similarity_score.regressed}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.similarity_score.regressed / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-300">Neutral</td>
                      <td className="px-4 py-2 text-sm">{by_metric.similarity_score.neutral}</td>
                      <td className="px-4 py-2 text-sm">
                        {overall.total_comparisons > 0
                          ? ((by_metric.similarity_score.neutral / overall.total_comparisons) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Safety Notice */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 italic">
            <strong>Note:</strong> This dashboard is read-only and observational. No model promotion occurs automatically. 
            All promotion decisions require manual review and approval.
          </p>
        </div>
      </div>
    </div>
  );
}

