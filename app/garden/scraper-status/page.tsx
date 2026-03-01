'use client';

import { useEffect, useState } from 'react';

type Status = {
  state: {
    harvesting_complete: boolean;
    harvesting_partial: boolean;
    assignment_complete: boolean;
    last_updated: string | null;
  };
  progress: {
    last_processed_index: number;
    total_queries: number;
    updated_at: string | null;
    assignment_index?: number;
    total_strains?: number;
    pool_images?: number;
  };
  likely_running: boolean;
};

export default function ScraperStatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/scraper-status');
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-red-600">Scraper status</h1>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold">Scraper status</h1>
        <p className="text-gray-500 mt-2">Loading…</p>
      </div>
    );
  }

  const { state, progress, likely_running } = status;
  const harvestPct = progress.total_queries
    ? Math.round((progress.last_processed_index / progress.total_queries) * 100)
    : 0;
  const assignPct =
    progress.total_strains && (progress.assignment_index ?? 0) > 0
      ? Math.round(((progress.assignment_index ?? 0) / progress.total_strains) * 100)
      : 0;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Image scraper status</h1>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              likely_running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="font-medium">
            {likely_running ? 'Likely running' : 'Not recently updated'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Harvest: {progress.last_processed_index} / {progress.total_queries} ({harvestPct}%) — 4,000 search queries for images
        </p>
        {typeof progress.pool_images === 'number' && (
          <p className="text-sm text-gray-600">Pool: {progress.pool_images.toLocaleString()} images</p>
        )}
        {progress.total_strains != null && (
          <p className="text-sm text-gray-600">
            Assignment: {(progress.assignment_index ?? 0).toLocaleString()} / {progress.total_strains.toLocaleString()} strains ({assignPct}%)
          </p>
        )}
        {state.last_updated && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {new Date(state.last_updated).toLocaleString()}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-gray-500">Harvesting complete</dt>
        <dd>{state.harvesting_complete ? 'Yes' : 'No'}</dd>
        <dt className="text-gray-500">Assignment complete</dt>
        <dd>{state.assignment_complete ? 'Yes' : 'No'}</dd>
      </dl>

      <p className="text-xs text-gray-500">
        Why 4,000 queries? Layer 1 builds search terms from strain names; they&apos;re capped at 4k to limit API use. Each query can match many strains, so Layer 3 assigns those images across all ~35k strains.
      </p>

      <p className="text-xs text-gray-400">
        Data from <code className="bg-gray-100 px-1">scraper_state.json</code> and{' '}
        <code className="bg-gray-100 px-1">progress_harvest.json</code>. Refreshes every 5s.
      </p>
    </div>
  );
}
