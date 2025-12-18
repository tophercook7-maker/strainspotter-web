'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SimilarityMapAdminClient() {
  const [rebuilding, setRebuilding] = useState(false);

  const rebuildMap = async () => {
    if (!confirm('Rebuild similarity map? This may take a few minutes.')) {
      return;
    }

    try {
      setRebuilding(true);
      const res = await fetch('/api/admin/similarity-map/rebuild', {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Rebuild failed');
      alert('Similarity map rebuilt successfully');
    } catch (error: any) {
      alert(`Failed to rebuild: ${error.message}`);
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Similarity Map Admin</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <button
          onClick={rebuildMap}
          disabled={rebuilding}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {rebuilding ? 'Rebuilding...' : 'Rebuild Map'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">View Map</h2>
        <Link
          href="/ai/similarity-map"
          className="text-blue-600 hover:underline"
        >
          Open Similarity Map →
        </Link>
      </div>
    </div>
  );
}
