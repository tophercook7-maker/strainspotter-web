'use client';

import { useState } from 'react';

export default function MatcherV3AdminClient() {
  const [testImageUrl, setTestImageUrl] = useState('');
  const [results, setResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testMatchers = async () => {
    if (!testImageUrl) {
      alert('Please enter an image URL');
      return;
    }

    try {
      setTesting(true);
      
      // Test both v2 and v3
      const [v2Res, v3Res] = await Promise.all([
        fetch('/api/visual-match/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: testImageUrl })
        }).then(r => r.json()),
        fetch('/api/visual-match/v3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: testImageUrl })
        }).then(r => r.json())
      ]);

      setResults({ v2: v2Res, v3: v3Res });
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Matcher V3 Admin</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Test Image URL</label>
        <input
          type="text"
          value={testImageUrl}
          onChange={(e) => setTestImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border rounded mb-4"
        />
        <button
          onClick={testMatchers}
          disabled={testing || !testImageUrl}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Compare V2 vs V3'}
        </button>
      </div>

      {results && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">V2 Results</h2>
            {results.v2.match && (
              <div>
                <div className="font-medium">Match: {results.v2.match.strain}</div>
                <div>Score: {results.v2.match.score}%</div>
                <div className="mt-4 text-sm">
                  <div>pHash: {results.v2.match.breakdown?.pHash}%</div>
                  <div>Color: {results.v2.match.breakdown?.color}%</div>
                  <div>Texture: {results.v2.match.breakdown?.texture}%</div>
                  <div>Embedding: {results.v2.match.breakdown?.embedding}%</div>
                  <div>Label: {results.v2.match.breakdown?.labelText}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">V3 Results</h2>
            {results.v3.match && (
              <div>
                <div className="font-medium">Match: {results.v3.match.strain}</div>
                <div>Score: {results.v3.match.score}%</div>
                <div className="mt-4 text-sm">
                  <div>pHash: {results.v3.match.breakdown?.pHash}%</div>
                  <div>Color: {results.v3.match.breakdown?.color}%</div>
                  <div>Texture: {results.v3.match.breakdown?.texture}%</div>
                  <div>Embedding: {results.v3.match.breakdown?.embedding}%</div>
                  <div>Cluster: {results.v3.match.breakdown?.cluster}%</div>
                  <div>Label: {results.v3.match.breakdown?.labelText}%</div>
                </div>
                {results.v3.match.variants && (
                  <div className="mt-2 text-xs text-gray-600">
                    Augmented variants: {results.v3.match.variants}
                  </div>
                )}
                {results.v3.match.explanation && (
                  <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                    <strong>AI Explanation:</strong>
                    <p className="mt-2">{results.v3.match.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
