'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { vaultTheme } from '../vaultTheme';
import { Box, Loader, BarChart, Play, Settings } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ModelsClient() {
  const { data, mutate } = useSWR('/api/vault/models/list', fetcher);
  const [loading, setLoading] = useState<string | null>(null);

  const models = data?.models || [];

  const loadModel = async (modelId: string) => {
    try {
      setLoading(modelId);
      const res = await fetch('/api/vault/models/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      if (!res.ok) throw new Error('Failed to load model');
      alert('Model loaded successfully');
    } catch (error: any) {
      alert(`Failed to load model: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const benchmarkModel = async (modelId: string) => {
    try {
      setLoading(modelId);
      const res = await fetch('/api/vault/models/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      if (!res.ok) throw new Error('Failed to benchmark model');
      const data = await res.json();
      alert(`Benchmark results:\nAccuracy: ${data.results.accuracy}\nLatency: ${data.results.latency_ms}ms`);
    } catch (error: any) {
      alert(`Failed to benchmark model: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Box className="h-8 w-8" />
          Model Zoo
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {models.map((model: any) => (
          <div
            key={model.id}
            className="rounded-[var(--radius-md)] border p-6"
            style={{
              backgroundColor: vaultTheme.colors.panelDark,
              borderColor: vaultTheme.colors.border
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{model.name}</h2>
                <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                  Version {model.version} • {model.type} • {model.embedding_dim}D embeddings
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadModel(model.id)}
                  disabled={loading === model.id}
                  className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
                  style={{
                    backgroundColor: vaultTheme.colors.accent,
                    color: 'white'
                  }}
                >
                  {loading === model.id ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Load
                </button>
                <button
                  onClick={() => benchmarkModel(model.id)}
                  disabled={loading === model.id}
                  className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
                  style={{
                    backgroundColor: vaultTheme.colors.panelMid,
                    color: vaultTheme.colors.textPrimary
                  }}
                >
                  <BarChart className="h-4 w-4" />
                  Benchmark
                </button>
              </div>
            </div>

            {model.metadata && (
              <div className="mt-4 p-3 rounded" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                <pre className="text-xs" style={{ color: vaultTheme.colors.textSecondary }}>
                  {JSON.stringify(model.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}

        {models.length === 0 && (
          <div className="text-center py-12" style={{ color: vaultTheme.colors.textSecondary }}>
            No models registered. Use the API to register models.
          </div>
        )}
      </div>
    </div>
  );
}
