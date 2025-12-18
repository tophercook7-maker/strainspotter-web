'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

export default function ScraperPanel() {
  const [strainSlug, setStrainSlug] = useState('');
  const [maxImages, setMaxImages] = useState(100);
  const [queue, setQueue] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQueue();
    loadLogs();
  }, []);

  const loadQueue = async () => {
    try {
      const res = await fetch('/api/vault/scraper/queue');
      if (!res.ok) throw new Error('Failed to load queue');
      const data = await res.json();
      setQueue(data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/vault/scraper/logs');
      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const startScrape = async () => {
    if (!strainSlug) {
      alert('Please enter a strain slug');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/vault/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain: strainSlug, maxImages })
      });
      if (!res.ok) throw new Error('Failed to start scrape');
      alert('Scrape job added to queue');
      setStrainSlug('');
      loadQueue();
    } catch (error: any) {
      alert(`Failed to start scrape: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Scraper Control Center</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Start Scrape */}
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">Start New Scrape</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Strain Slug</label>
              <input
                type="text"
                value={strainSlug}
                onChange={(e) => setStrainSlug(e.target.value)}
                placeholder="blue-dream"
                className="w-full px-3 py-2 rounded"
                style={{
                  backgroundColor: vaultTheme.colors.panelMid,
                  color: vaultTheme.colors.textPrimary,
                  borderColor: vaultTheme.colors.border
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Max Images</label>
              <input
                type="number"
                value={maxImages}
                onChange={(e) => setMaxImages(parseInt(e.target.value))}
                min="1"
                max="500"
                className="w-full px-3 py-2 rounded"
                style={{
                  backgroundColor: vaultTheme.colors.panelMid,
                  color: vaultTheme.colors.textPrimary,
                  borderColor: vaultTheme.colors.border
                }}
              />
            </div>
            <button
              onClick={startScrape}
              disabled={loading || !strainSlug}
              className="w-full px-4 py-2 rounded hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: vaultTheme.colors.accent,
                color: 'white'
              }}
            >
              {loading ? 'Starting...' : 'Start Scrape'}
            </button>
          </div>
        </div>

        {/* Queue Status */}
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
          {queue && (
            <div className="space-y-2">
              <div>Queued: {queue.queued}</div>
              <div>Active: {queue.active}</div>
              {queue.activeJob && (
                <div className="mt-4 p-3 rounded" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                  <div className="font-medium">Active Job:</div>
                  <div className="text-sm">{queue.activeJob.strain} - {queue.activeJob.type}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Logs */}
      <div
        className="mt-6 rounded-[var(--radius-md)] border p-6"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>
        <div
          className="font-mono text-xs p-4 rounded overflow-auto max-h-64"
          style={{ backgroundColor: vaultTheme.colors.bgDeep }}
        >
          {logs.slice(-50).map((log, idx) => (
            <div key={idx} style={{ color: vaultTheme.colors.textSecondary }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
