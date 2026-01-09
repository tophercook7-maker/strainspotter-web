'use client';

import { useState, useEffect } from 'react';

interface MatcherConfig {
  version: number;
  weight_phash: number;
  weight_color: number;
  weight_texture: number;
  weight_embedding: number;
  weight_label: number;
}

export default function ModelTunerClient() {
  const [config, setConfig] = useState<MatcherConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testImageUrl, setTestImageUrl] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/model/config');
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = (key: keyof MatcherConfig, value: number) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const normalizeWeights = () => {
    if (!config) return;
    const sum = config.weight_phash + config.weight_color + config.weight_texture +
                config.weight_embedding + config.weight_label;
    if (sum === 0) return;
    
    setConfig({
      ...config,
      weight_phash: config.weight_phash / sum,
      weight_color: config.weight_color / sum,
      weight_texture: config.weight_texture / sum,
      weight_embedding: config.weight_embedding / sum,
      weight_label: config.weight_label / sum
    });
  };

  const saveConfig = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/model/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to save config');
      alert('Config saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`Failed to save: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const testMatcher = async () => {
    if (!testImageUrl) {
      alert('Please enter an image URL');
      return;
    }
    try {
      setTesting(true);
      const res = await fetch('/api/admin/model/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: testImageUrl })
      });
      if (!res.ok) throw new Error('Test failed');
      const data = await res.json();
      setTestResults(data);
    } catch (error) {
      console.error('Test error:', error);
      alert(`Test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Model Tuner</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Model Tuner</h1>
        <p className="text-red-500">Failed to load config</p>
      </div>
    );
  }

  const weightSum = config.weight_phash + config.weight_color + config.weight_texture +
                    config.weight_embedding + config.weight_label;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Model Tuner</h1>

      {/* Weight Adjustments */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Weight Adjustments</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              pHash Weight: {config.weight_phash.toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.weight_phash}
              onChange={(e) => updateWeight('weight_phash', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Color Weight: {config.weight_color.toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.weight_color}
              onChange={(e) => updateWeight('weight_color', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Texture Weight: {config.weight_texture.toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.weight_texture}
              onChange={(e) => updateWeight('weight_texture', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Embedding Weight: {config.weight_embedding.toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.weight_embedding}
              onChange={(e) => updateWeight('weight_embedding', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Label/Text Weight: {config.weight_label.toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.weight_label}
              onChange={(e) => updateWeight('weight_label', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className={`text-sm ${Math.abs(weightSum - 1.0) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            Sum: {weightSum.toFixed(3)} {Math.abs(weightSum - 1.0) < 0.01 ? '✓' : '(must be 1.0)'}
          </div>
          <button
            onClick={normalizeWeights}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Normalize
          </button>
          <button
            onClick={saveConfig}
            disabled={saving || Math.abs(weightSum - 1.0) >= 0.01}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Model Testing */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Model Testing Sandbox</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Image URL</label>
          <input
            type="text"
            value={testImageUrl}
            onChange={(e) => setTestImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <button
          onClick={testMatcher}
          disabled={testing || !testImageUrl}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Matcher'}
        </button>

        {testResults && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">V1 Results</h3>
              {testResults.v1?.match && (
                <div className="bg-gray-50 p-3 rounded">
                  <div>Match: {testResults.v1.match.name}</div>
                  <div>Score: {testResults.v1.match.confidence}%</div>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">V2 Results</h3>
              {testResults.v2?.top && (
                <div className="bg-gray-50 p-3 rounded">
                  <div>Match: {testResults.v2.top.strain}</div>
                  <div>Score: {testResults.v2.top.score}%</div>
                  <div className="text-sm mt-2">
                    Breakdown: pHash {testResults.v2.top.breakdown.pHash}%, 
                    Color {testResults.v2.top.breakdown.color}%, 
                    Texture {testResults.v2.top.breakdown.texture}%, 
                    Embedding {testResults.v2.top.breakdown.embedding}%, 
                    Label {testResults.v2.top.breakdown.labelText}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
