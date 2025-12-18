'use client';

import { useState } from 'react';

export default function AugmentTestClient() {
  const [imageUrl, setImageUrl] = useState('');
  const [augments, setAugments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAugmentation = async () => {
    if (!imageUrl) {
      alert('Please enter an image URL');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/augment-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl })
      });
      if (!res.ok) throw new Error('Test failed');
      const data = await res.json();
      setAugments(data.augments || []);
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Augmentation Test</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Image URL</label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border rounded mb-4"
        />
        <button
          onClick={testAugmentation}
          disabled={loading || !imageUrl}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Augmentation'}
        </button>
      </div>

      {augments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Augmented Variants</h2>
          <div className="grid grid-cols-4 gap-4">
            {augments.map((aug, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-2">
                <img
                  src={aug.preview_url || imageUrl}
                  alt={aug.type}
                  className="w-full h-48 object-cover rounded mb-2"
                />
                <div className="text-sm font-medium">{aug.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
