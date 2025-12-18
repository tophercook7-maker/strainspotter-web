'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

export default function GeneratorPanel() {
  const [strainSlug, setStrainSlug] = useState('');
  const [phenotypes, setPhenotypes] = useState(true);
  const [lighting, setLighting] = useState(true);
  const [photographyStyles, setPhotographyStyles] = useState(true);
  const [count, setCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const startGeneration = async () => {
    if (!strainSlug) {
      alert('Please enter a strain slug');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/vault/generator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strain: strainSlug,
          phenotypes,
          lighting,
          photographyStyles,
          count
        })
      });
      if (!res.ok) throw new Error('Failed to start generation');
      alert('Generation job added to queue');
      setStrainSlug('');
    } catch (error: any) {
      alert(`Failed to start generation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!strainSlug) return;
    try {
      const res = await fetch(`/api/vault/generator/preview?strain=${strainSlug}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  };

  useEffect(() => {
    if (strainSlug) {
      loadPreview();
    }
  }, [strainSlug]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Generator Control Center</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Generation Controls */}
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">Start Generation</h2>
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
              <label className="block text-sm mb-2">Number of Images</label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                min="1"
                max="200"
                className="w-full px-3 py-2 rounded"
                style={{
                  backgroundColor: vaultTheme.colors.panelMid,
                  color: vaultTheme.colors.textPrimary,
                  borderColor: vaultTheme.colors.border
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={phenotypes}
                  onChange={(e) => setPhenotypes(e.target.checked)}
                />
                Phenotype Variations
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lighting}
                  onChange={(e) => setLighting(e.target.checked)}
                />
                Lighting Variations
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={photographyStyles}
                  onChange={(e) => setPhotographyStyles(e.target.checked)}
                />
                Photography Style Variations
              </label>
            </div>
            <button
              onClick={startGeneration}
              disabled={loading || !strainSlug}
              className="w-full px-4 py-2 rounded hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: vaultTheme.colors.accent,
                color: 'white'
              }}
            >
              {loading ? 'Starting...' : 'Start Generation'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          {previewImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {previewImages.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
              ))}
            </div>
          ) : (
            <div style={{ color: vaultTheme.colors.textSecondary }}>
              Enter strain slug to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
