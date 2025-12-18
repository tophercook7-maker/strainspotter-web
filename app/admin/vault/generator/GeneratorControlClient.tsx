'use client';

import { useState, useEffect } from 'react';

export default function GeneratorControlClient() {
  const [strainSlug, setStrainSlug] = useState('');
  const [phenotypes, setPhenotypes] = useState(true);
  const [lighting, setLighting] = useState(true);
  const [photographyStyles, setPhotographyStyles] = useState(true);
  const [count, setCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    loadRecentJobs();
  }, []);

  const loadRecentJobs = async () => {
    try {
      const res = await fetch('/api/admin/vault/jobs/history?limit=20');
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      const generatorJobs = data.history.filter((j: any) => j.type === 'generate');
      setRecentJobs(generatorJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const startGeneration = async () => {
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
          type: 'generate',
          strain: strainSlug,
          payload: {
            phenotypes,
            lighting,
            photographyStyles,
            count
          }
        })
      });
      if (!res.ok) throw new Error('Failed to start generation');
      alert('Generation job added to queue');
      setStrainSlug('');
      loadRecentJobs();
    } catch (error: any) {
      alert(`Failed to start generation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Generator Control Panel</h1>

      {/* Start Generation */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Start Synthetic Generation</h2>
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
            <label className="block text-sm font-medium mb-2">Number of Images</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              min="1"
              max="200"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={phenotypes}
                onChange={(e) => setPhenotypes(e.target.checked)}
              />
              Include Phenotype Variations
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lighting}
                onChange={(e) => setLighting(e.target.checked)}
              />
              Include Lighting Variations
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={photographyStyles}
                onChange={(e) => setPhotographyStyles(e.target.checked)}
              />
              Include Photography Style Variations
            </label>
          </div>
          <button
            onClick={startGeneration}
            disabled={loading || !strainSlug}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add to Queue'}
          </button>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Generation Jobs</h2>
        <div className="space-y-2">
          {recentJobs.length === 0 ? (
            <div className="text-gray-500">No recent jobs</div>
          ) : (
            recentJobs.map((job) => (
              <div key={job.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{job.strain}</div>
                    <div className="text-sm text-gray-600">
                      {job.status} - {job.payload?.count || 0} images
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
