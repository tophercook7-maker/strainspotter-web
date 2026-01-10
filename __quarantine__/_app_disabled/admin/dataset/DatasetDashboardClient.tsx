'use client';

import { useState, useEffect } from 'react';

interface StrainStats {
  slug: string;
  name: string;
  realImages: number;
  syntheticImages: number;
  hasManifest: boolean;
  lastScraped: string | null;
  lastGenerated: string | null;
  lastManifest: string | null;
}

interface DashboardStats {
  totalStrains: number;
  totalRealImages: number;
  totalSyntheticImages: number;
  manifestCount: number;
  oldestDataset: string | null;
  mostRecentUpdate: string | null;
  strains: StrainStats[];
}

export default function DatasetDashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dataset/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const triggerAction = async (action: string, strain: string) => {
    try {
      setActionLoading(`${action}-${strain}`);
      const res = await fetch(`/api/admin/dataset/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain })
      });
      if (!res.ok) throw new Error('Action failed');
      // Reload stats after a delay
      setTimeout(loadStats, 2000);
    } catch (error) {
      console.error(`Failed to trigger ${action}:`, error);
      alert(`Failed to trigger ${action}: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const triggerFullPipelineAll = async () => {
    if (!confirm('Run full pipeline for ALL strains? This may take a long time.')) {
      return;
    }
    try {
      setActionLoading('full-all');
      const res = await fetch('/api/admin/dataset/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (!res.ok) throw new Error('Failed to trigger full pipeline');
      alert('Full pipeline started for all strains');
    } catch (error) {
      console.error('Failed to trigger full pipeline:', error);
      alert(`Failed to trigger full pipeline: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dataset Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dataset Dashboard</h1>
        <p className="text-red-500">Failed to load dataset statistics</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dataset Dashboard</h1>
        <p className="text-gray-600">Manage strain datasets and trigger pipeline operations</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Strains</div>
          <div className="text-2xl font-bold">{stats.totalStrains}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Real Images</div>
          <div className="text-2xl font-bold">{stats.totalRealImages.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Synthetic Images</div>
          <div className="text-2xl font-bold">{stats.totalSyntheticImages.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Manifests</div>
          <div className="text-2xl font-bold">{stats.manifestCount}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <button
          onClick={triggerFullPipelineAll}
          disabled={actionLoading === 'full-all'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {actionLoading === 'full-all' ? 'Starting...' : 'Run Full Pipeline for ALL Strains'}
        </button>
      </div>

      {/* Strains Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Strain</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Real</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Synthetic</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Manifest</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Last Updated</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stats.strains.map((strain) => (
              <tr key={strain.slug}>
                <td className="px-4 py-3">
                  <div className="font-medium">{strain.name}</div>
                  <div className="text-sm text-gray-500">{strain.slug}</div>
                </td>
                <td className="px-4 py-3">{strain.realImages}</td>
                <td className="px-4 py-3">{strain.syntheticImages}</td>
                <td className="px-4 py-3">
                  {strain.hasManifest ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {strain.lastManifest
                    ? new Date(strain.lastManifest).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => triggerAction('scrape', strain.slug)}
                      disabled={actionLoading === `scrape-${strain.slug}`}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Scrape
                    </button>
                    <button
                      onClick={() => triggerAction('generate', strain.slug)}
                      disabled={actionLoading === `generate-${strain.slug}`}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Generate
                    </button>
                    <button
                      onClick={() => triggerAction('process', strain.slug)}
                      disabled={actionLoading === `process-${strain.slug}`}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Process
                    </button>
                    <button
                      onClick={() => triggerAction('upload', strain.slug)}
                      disabled={actionLoading === `upload-${strain.slug}`}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Upload
                    </button>
                    <button
                      onClick={() => triggerAction('manifest', strain.slug)}
                      disabled={actionLoading === `manifest-${strain.slug}`}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Manifest
                    </button>
                    <button
                      onClick={() => triggerAction('full', strain.slug)}
                      disabled={actionLoading === `full-${strain.slug}`}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded disabled:opacity-50"
                    >
                      Full
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
