'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

interface StrainData {
  slug: string;
  name: string;
  real: number;
  synthetic: number;
  processed: number;
  hasManifest: boolean;
  updated: string | null;
}

export default function DatasetManager() {
  const [strains, setStrains] = useState<StrainData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vault/datasets/list');
      if (!res.ok) throw new Error('Failed to load datasets');
      const data = await res.json();
      setStrains(data.strains || []);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (strain: StrainData) => {
    if (strain.real >= 30 && strain.synthetic >= 20 && strain.hasManifest) {
      return { status: 'healthy', color: vaultTheme.colors.success };
    } else if (strain.real >= 10 || strain.synthetic >= 10) {
      return { status: 'partial', color: vaultTheme.colors.warning };
    } else {
      return { status: 'missing', color: vaultTheme.colors.error };
    }
  };

  if (loading) {
    return <div>Loading datasets...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dataset Manager</h1>
        <button
          onClick={loadDatasets}
          className="px-4 py-2 rounded hover:opacity-80"
          style={{
            backgroundColor: vaultTheme.colors.accent,
            color: 'white'
          }}
        >
          Refresh
        </button>
      </div>

      <div
        className="rounded-[var(--radius-md)] border overflow-hidden"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottomColor: vaultTheme.colors.border }}>
              <th className="text-left py-3 px-4">Strain</th>
              <th className="text-left py-3 px-4">Real</th>
              <th className="text-left py-3 px-4">Synthetic</th>
              <th className="text-left py-3 px-4">Processed</th>
              <th className="text-left py-3 px-4">Manifest</th>
              <th className="text-left py-3 px-4">Health</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {strains.map((strain) => {
              const health = getHealthStatus(strain);
              return (
                <tr
                  key={strain.slug}
                  style={{ borderBottomColor: vaultTheme.colors.border }}
                  className="hover:opacity-80"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium">{strain.name}</div>
                    <div className="text-xs" style={{ color: vaultTheme.colors.textSecondary }}>
                      {strain.slug}
                    </div>
                  </td>
                  <td className="py-3 px-4">{strain.real}</td>
                  <td className="py-3 px-4">{strain.synthetic}</td>
                  <td className="py-3 px-4">{strain.processed}</td>
                  <td className="py-3 px-4">
                    {strain.hasManifest ? (
                      <span style={{ color: vaultTheme.colors.success }}>✓</span>
                    ) : (
                      <span style={{ color: vaultTheme.colors.error }}>✗</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: health.color + '20',
                        color: health.color
                      }}
                    >
                      {health.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      className="px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: vaultTheme.colors.panelMid,
                        color: vaultTheme.colors.textPrimary,
                        borderColor: vaultTheme.colors.border
                      }}
                    >
                      <option>Actions</option>
                      <option>Run Pipeline</option>
                      <option>Rebuild Manifest</option>
                      <option>Delete</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
