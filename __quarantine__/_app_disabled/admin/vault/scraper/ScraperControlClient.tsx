'use client';

import { useState, useEffect } from 'react';

interface ScraperJob {
  job_id: string;
  strain: string;
  status: string;
  started_at: string;
  completed_at?: string;
  images_scraped?: number;
  error?: string;
}

export default function ScraperControlClient() {
  const [strainSlug, setStrainSlug] = useState('');
  const [maxImages, setMaxImages] = useState(100);
  const [queue, setQueue] = useState<any>(null);
  const [jobs, setJobs] = useState<ScraperJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQueue();
    loadJobs();
  }, []);

  const loadQueue = async () => {
    try {
      const res = await fetch('/api/admin/vault/jobs/queue');
      if (!res.ok) throw new Error('Failed to load queue');
      const data = await res.json();
      setQueue(data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadJobs = async () => {
    try {
      // Load from Supabase scraper_jobs table
      const res = await fetch('/api/admin/vault/scraper/jobs');
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const startScrape = async () => {
    if (!strainSlug) {
      alert('Please enter a strain slug');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/vault/jobs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'scrape',
          strain: strainSlug,
          payload: { maxImages }
        })
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
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Scraper Control Panel</h1>

      {/* Start New Scrape */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Start New Scrape</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Strain Slug</label>
            <input
              type="text"
              value={strainSlug}
              onChange={(e) => setStrainSlug(e.target.value)}
              placeholder="blue-dream"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Images</label>
            <input
              type="number"
              value={maxImages}
              onChange={(e) => setMaxImages(parseInt(e.target.value))}
              min="1"
              max="500"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button
            onClick={startScrape}
            disabled={loading || !strainSlug}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add to Queue'}
          </button>
        </div>
      </div>

      {/* Queue Status */}
      {queue && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
          <div className="space-y-2">
            <div>Queued: {queue.queued}</div>
            <div>Active: {queue.active}</div>
            {queue.activeJob && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="font-medium">Active Job:</div>
                <div className="text-sm">{queue.activeJob.strain} - {queue.activeJob.type}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Scraper Jobs</h2>
        <div className="space-y-2">
          {jobs.slice(0, 20).map((job) => (
            <div key={job.job_id} className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{job.strain}</div>
                  <div className="text-sm text-gray-600">
                    {job.status} - {job.images_scraped || 0} images
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(job.started_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
