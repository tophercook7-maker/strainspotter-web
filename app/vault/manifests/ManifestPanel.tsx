'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

interface Manifest {
  strain: string;
  generated_at: string;
  metadata: {
    total_images: number;
    real_count: number;
    synthetic_count: number;
  };
}

export default function ManifestPanel() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [selectedManifest, setSelectedManifest] = useState<Manifest | null>(null);
  const [manifestContent, setManifestContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManifests();
  }, []);

  useEffect(() => {
    if (selectedManifest) {
      loadManifestContent(selectedManifest.strain);
    }
  }, [selectedManifest]);

  const loadManifests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vault/manifests/list');
      if (!res.ok) throw new Error('Failed to load manifests');
      const data = await res.json();
      setManifests(data.manifests || []);
    } catch (error) {
      console.error('Failed to load manifests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManifestContent = async (strain: string) => {
    try {
      const res = await fetch(`/api/vault/manifests/read?strain=${strain}`);
      if (!res.ok) throw new Error('Failed to load manifest');
      const data = await res.json();
      setManifestContent(data);
    } catch (error) {
      console.error('Failed to load manifest content:', error);
    }
  };

  const rebuildManifest = async (strain: string) => {
    if (!confirm(`Rebuild manifest for ${strain}?`)) return;

    try {
      const res = await fetch('/api/vault/manifests/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain })
      });
      if (!res.ok) throw new Error('Failed to rebuild manifest');
      alert('Manifest rebuild started');
      loadManifests();
    } catch (error: any) {
      alert(`Failed to rebuild: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading manifests...</div>;
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Manifest List */}
      <div
        className="w-80 flex-shrink-0 rounded-[var(--radius-md)] border p-4 overflow-y-auto"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="font-semibold mb-4">Manifests ({manifests.length})</h2>
        <div className="space-y-2">
          {manifests.map((manifest) => (
            <div
              key={manifest.strain}
              onClick={() => setSelectedManifest(manifest)}
              className={`p-3 rounded cursor-pointer ${
                selectedManifest?.strain === manifest.strain ? 'ring-2' : ''
              }`}
              style={{
                backgroundColor:
                  selectedManifest?.strain === manifest.strain
                    ? vaultTheme.colors.panelLight
                    : vaultTheme.colors.panelMid,
                borderColor:
                  selectedManifest?.strain === manifest.strain
                    ? vaultTheme.colors.accent
                    : 'transparent'
              }}
            >
              <div className="font-medium">{manifest.strain}</div>
              <div className="text-xs mt-1" style={{ color: vaultTheme.colors.textSecondary }}>
                {manifest.metadata.total_images} images
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manifest Viewer */}
      <div
        className="flex-1 rounded-[var(--radius-md)] border p-6 overflow-y-auto"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        {selectedManifest ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedManifest.strain}</h2>
              <button
                onClick={() => rebuildManifest(selectedManifest.strain)}
                className="px-4 py-2 rounded hover:opacity-80"
                style={{
                  backgroundColor: vaultTheme.colors.accent,
                  color: 'white'
                }}
              >
                Rebuild
              </button>
            </div>
            {manifestContent && (
              <div
                className="font-mono text-xs p-4 rounded overflow-auto"
                style={{ backgroundColor: vaultTheme.colors.bgDeep }}
              >
                <pre>{JSON.stringify(manifestContent, null, 2)}</pre>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: vaultTheme.colors.textSecondary }}>
            Select a manifest to view
          </div>
        )}
      </div>
    </div>
  );
}
