'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

interface AIStatus {
  gpu_server: {
    status: 'online' | 'offline';
    url: string;
    latency?: number;
  };
  embedding_server: {
    status: 'online' | 'offline';
    url: string;
    latency?: number;
  };
  metrics?: {
    gpu_utilization?: number;
    vram_usage?: number;
    embedding_latency?: number;
    pipeline_depth?: number;
  };
}

export default function AIMonitor() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/vault/ai/status');
      if (!res.ok) throw new Error('Failed to load status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load AI status:', error);
    } finally {
      setLoading(false);
    }
  };

  const restartServer = async () => {
    if (!confirm('Restart GPU server? This may interrupt active jobs.')) return;

    try {
      const res = await fetch('/api/vault/ai/restart', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restart server');
      alert('Server restart initiated');
      setTimeout(loadStatus, 2000);
    } catch (error: any) {
      alert(`Failed to restart: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading AI status...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">AI System Monitor</h1>
        <button
          onClick={restartServer}
          className="px-4 py-2 rounded hover:opacity-80"
          style={{
            backgroundColor: vaultTheme.colors.warning,
            color: 'white'
          }}
        >
          Restart GPU Server
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* GPU Server Status */}
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">GPU Server</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    status?.gpu_server.status === 'online'
                      ? vaultTheme.colors.success
                      : vaultTheme.colors.error
                }}
              />
              <span>
                {status?.gpu_server.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
              URL: {status?.gpu_server.url || 'N/A'}
            </div>
            {status?.gpu_server.latency && (
              <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                Latency: {status.gpu_server.latency}ms
              </div>
            )}
          </div>
        </div>

        {/* Embedding Server Status */}
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">Embedding Server</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    status?.embedding_server.status === 'online'
                      ? vaultTheme.colors.success
                      : vaultTheme.colors.error
                }}
              />
              <span>
                {status?.embedding_server.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
              URL: {status?.embedding_server.url || 'N/A'}
            </div>
            {status?.embedding_server.latency && (
              <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                Latency: {status.embedding_server.latency}ms
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {status?.metrics && (
        <div
          className="rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4">Metrics</h2>
          <div className="grid grid-cols-4 gap-4">
            {status.metrics.gpu_utilization !== undefined && (
              <div>
                <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
                  GPU Utilization
                </div>
                <div className="text-2xl font-bold">{status.metrics.gpu_utilization}%</div>
                <div className="w-full h-2 rounded-full mt-2" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${status.metrics.gpu_utilization}%`,
                      backgroundColor: vaultTheme.colors.accent
                    }}
                  />
                </div>
              </div>
            )}
            {status.metrics.vram_usage !== undefined && (
              <div>
                <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
                  VRAM Usage
                </div>
                <div className="text-2xl font-bold">{status.metrics.vram_usage}%</div>
                <div className="w-full h-2 rounded-full mt-2" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${status.metrics.vram_usage}%`,
                      backgroundColor: vaultTheme.colors.warning
                    }}
                  />
                </div>
              </div>
            )}
            {status.metrics.embedding_latency !== undefined && (
              <div>
                <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
                  Embedding Latency
                </div>
                <div className="text-2xl font-bold">{status.metrics.embedding_latency}ms</div>
              </div>
            )}
            {status.metrics.pipeline_depth !== undefined && (
              <div>
                <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
                  Pipeline Depth
                </div>
                <div className="text-2xl font-bold">{status.metrics.pipeline_depth}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
