'use client';

import { useState, useEffect } from 'react';

interface Cluster {
  cluster_id: number;
  size: number;
  representative_image: string | null;
  image_urls: string[];
  centroid: number[] | null;
}

interface ClustersData {
  strain: string;
  num_clusters: number;
  total_images: number;
  clusters: Cluster[];
}

export default function ClustersClient() {
  const [strains, setStrains] = useState<Array<{ slug: string; name: string }>>([]);
  const [selectedStrain, setSelectedStrain] = useState<string>('');
  const [clustersData, setClustersData] = useState<ClustersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

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
      const res = await fetch('/api/admin/dataset/stats');
      if (!res.ok) throw new Error('Failed to load strains');
      const data = await res.json();
      setStrains(data.strains.map((s: any) => ({ slug: s.slug, name: s.name })));
    } catch (error) {
      console.error('Failed to load strains:', error);
    }
  };

  const loadClusters = async (strainSlug: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/clusters/${strainSlug}`);
      if (!res.ok) throw new Error('Failed to load clusters');
      const data = await res.json();
      setClustersData(data);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClustersData(null);
    } finally {
      setLoading(false);
    }
  };

  const regenerateClusters = async () => {
    if (!selectedStrain) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/clusters/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain: selectedStrain })
      });
      if (!res.ok) throw new Error('Failed to regenerate clusters');
      await loadClusters(selectedStrain);
    } catch (error) {
      console.error('Failed to regenerate clusters:', error);
      alert(`Failed to regenerate: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clusterColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Phenotype Clustering Explorer</h1>

      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium mb-2">Select Strain</label>
            <select
              value={selectedStrain}
              onChange={(e) => setSelectedStrain(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">-- Select --</option>
              {strains.map((strain) => (
                <option key={strain.slug} value={strain.slug}>
                  {strain.name}
                </option>
              ))}
            </select>

            {clustersData && (
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Clusters: <strong>{clustersData.num_clusters}</strong>
                </div>
                <div className="text-sm text-gray-600">
                  Total Images: <strong>{clustersData.total_images}</strong>
                </div>
              </div>
            )}

            {selectedStrain && (
              <button
                onClick={regenerateClusters}
                disabled={loading}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Regenerating...' : 'Regenerate Clusters'}
              </button>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1">
          {loading && !clustersData ? (
            <div className="text-center py-12">Loading clusters...</div>
          ) : clustersData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clustersData.clusters.map((cluster, idx) => (
                <div
                  key={cluster.cluster_id}
                  onClick={() => setSelectedCluster(cluster)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
                  style={{ borderTop: `4px solid ${clusterColors[idx % clusterColors.length]}` }}
                >
                  {cluster.representative_image ? (
                    <img
                      src={cluster.representative_image}
                      alt={`Cluster ${cluster.cluster_id}`}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      No Image
                    </div>
                  )}
                  <div className="p-3">
                    <div className="font-semibold">Cluster {cluster.cluster_id}</div>
                    <div className="text-sm text-gray-600">{cluster.size} images</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a strain to view clusters
            </div>
          )}
        </div>
      </div>

      {/* Cluster Detail Modal */}
      {selectedCluster && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedCluster(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Cluster {selectedCluster.cluster_id}</h2>
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <strong>Size:</strong> {selectedCluster.size} images
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {selectedCluster.image_urls.slice(0, 12).map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-32 object-cover rounded"
                />
              ))}
            </div>

            {selectedCluster.centroid && (
              <div className="mt-4">
                <strong>Centroid Embedding:</strong>
                <div className="text-xs font-mono bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                  [{selectedCluster.centroid.slice(0, 10).map((v, i) => v.toFixed(3)).join(', ')}, ...]
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
