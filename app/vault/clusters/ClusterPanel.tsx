'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

interface Cluster {
  cluster_id: number;
  size: number;
  representative_image: string | null;
  image_urls: string[];
}

export default function ClusterPanel() {
  const [strains, setStrains] = useState<string[]>([]);
  const [selectedStrain, setSelectedStrain] = useState<string>('');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStrains();
  }, []);

  useEffect(() => {
    if (selectedStrain) {
      loadClusters(selectedStrain);
    }
  }, [selectedStrain]);

  const loadStrains = async () => {
    try {
      const res = await fetch('/api/vault/datasets/list');
      if (!res.ok) throw new Error('Failed to load strains');
      const data = await res.json();
      setStrains(data.strains.map((s: any) => s.slug));
    } catch (error) {
      console.error('Failed to load strains:', error);
    }
  };

  const loadClusters = async (strain: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vault/clusters/list?strain=${strain}`);
      if (!res.ok) throw new Error('Failed to load clusters');
      const data = await res.json();
      setClusters(data.clusters || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const regenerateClusters = async () => {
    if (!selectedStrain) return;
    if (!confirm(`Regenerate clusters for ${selectedStrain}?`)) return;

    try {
      const res = await fetch('/api/vault/clusters/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain: selectedStrain })
      });
      if (!res.ok) throw new Error('Failed to regenerate clusters');
      alert('Cluster regeneration started');
      loadClusters(selectedStrain);
    } catch (error: any) {
      alert(`Failed to regenerate: ${error.message}`);
    }
  };

  const clusterColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cluster Manager</h1>
        <div className="flex gap-4">
          <select
            value={selectedStrain}
            onChange={(e) => setSelectedStrain(e.target.value)}
            className="px-4 py-2 rounded"
            style={{
              backgroundColor: vaultTheme.colors.panelMid,
              color: vaultTheme.colors.textPrimary,
              borderColor: vaultTheme.colors.border
            }}
          >
            <option value="">Select Strain</option>
            {strains.map((strain) => (
              <option key={strain} value={strain}>
                {strain}
              </option>
            ))}
          </select>
          {selectedStrain && (
            <button
              onClick={regenerateClusters}
              className="px-4 py-2 rounded hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.accent,
                color: 'white'
              }}
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div>Loading clusters...</div>
      ) : clusters.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {clusters.map((cluster, idx) => (
            <div
              key={cluster.cluster_id}
              onClick={() => setSelectedCluster(cluster)}
              className="rounded-[var(--radius-md)] border p-4 cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.panelDark,
                borderColor: clusterColors[idx % clusterColors.length],
                borderWidth: selectedCluster?.cluster_id === cluster.cluster_id ? '2px' : '1px'
              }}
            >
              {cluster.representative_image ? (
                <img
                  src={cluster.representative_image}
                  alt={`Cluster ${cluster.cluster_id}`}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              ) : (
                <div className="w-full h-32 rounded mb-2 flex items-center justify-center" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                  No Image
                </div>
              )}
              <div className="font-medium">Cluster {cluster.cluster_id}</div>
              <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                {cluster.size} images
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: vaultTheme.colors.textSecondary }}>
          {selectedStrain ? 'No clusters found. Click Regenerate to create clusters.' : 'Select a strain to view clusters.'}
        </div>
      )}

      {/* Cluster Detail Modal */}
      {selectedCluster && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedCluster(null)}
        >
          <div
            className="bg-[var(--botanical-bg-surface)] rounded-[var(--radius-md)] p-6 max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ borderColor: vaultTheme.colors.border }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Cluster {selectedCluster.cluster_id}</h2>
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <strong>Size:</strong> {selectedCluster.size} images
            </div>
            <div className="grid grid-cols-4 gap-2">
              {selectedCluster.image_urls.slice(0, 12).map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
