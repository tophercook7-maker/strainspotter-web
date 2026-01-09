'use client';

import { useState, useEffect } from 'react';

interface VaultEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  created?: string;
  modified?: string;
}

export default function VaultExplorerClient() {
  const [stats, setStats] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadDirectory('');
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/vault/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true);
      const url = path ? `/api/admin/vault/browse?path=${encodeURIComponent(path)}` : '/api/admin/vault/browse';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load directory');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleEntryClick = (entry: VaultEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
      setSelectedEntry(null);
    } else {
      setSelectedEntry(entry);
    }
  };

  const handleBack = () => {
    const segments = currentPath.split('/').filter(Boolean);
    segments.pop();
    setCurrentPath(segments.join('/'));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Vault Dataset Explorer</h1>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Datasets</div>
            <div className="text-2xl font-bold">{stats.datasets?.count || 0}</div>
            <div className="text-xs text-gray-500">{formatSize(stats.datasets?.size || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Raw Images</div>
            <div className="text-2xl font-bold">{stats.raw?.count || 0}</div>
            <div className="text-xs text-gray-500">{formatSize(stats.raw?.size || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Synthetic</div>
            <div className="text-2xl font-bold">{stats.synthetic?.count || 0}</div>
            <div className="text-xs text-gray-500">{formatSize(stats.synthetic?.size || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Manifests</div>
            <div className="text-2xl font-bold">{stats.manifests?.count || 0}</div>
            <div className="text-xs text-gray-500">{formatSize(stats.manifests?.size || 0)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* File Browser */}
        <div className="col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            {currentPath && (
              <button
                onClick={handleBack}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                ← Back
              </button>
            )}
            <div className="text-sm text-gray-600">
              Path: /{currentPath || 'root'}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.path}
                  onClick={() => handleEntryClick(entry)}
                  className={`p-3 rounded cursor-pointer hover:bg-gray-50 ${
                    selectedEntry?.path === entry.path ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.isDirectory ? '📁' : '📄'}
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    {entry.size && (
                      <span className="text-sm text-gray-500">{formatSize(entry.size)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Pane */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          {selectedEntry ? (
            <div>
              <div className="font-medium mb-2">{selectedEntry.name}</div>
              {selectedEntry.isDirectory ? (
                <div className="text-sm text-gray-600">Directory</div>
              ) : (
                <div>
                  {selectedEntry.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img
                      src={`/api/admin/vault/file?path=${encodeURIComponent(selectedEntry.path)}`}
                      alt={selectedEntry.name}
                      className="w-full rounded"
                    />
                  ) : selectedEntry.name.endsWith('.json') ? (
                    <div className="text-xs font-mono bg-gray-50 p-2 rounded overflow-auto max-h-64">
                      {/* JSON preview would go here */}
                      JSON file
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No preview available</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Select a file to preview</div>
          )}
        </div>
      </div>
    </div>
  );
}
