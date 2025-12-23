'use client';

/**
 * Internal Pipeline Dashboard
 * 
 * Read-only dashboard for visualizing pipeline status.
 * Polls /api/pipeline/status every 5-10 seconds.
 * 
 * NOTE: Access control should be added at the route level if needed.
 */

import { useEffect, useState } from 'react';

interface PipelineStage {
  name: string;
  status: 'idle' | 'running' | 'complete' | 'stalled' | 'error';
  progress: number;
  completed: number;
  total: number;
  rate_per_minute: number;
  last_update: string;
  stalled?: boolean;
}

interface PipelineStatus {
  active_stage: string | null;
  health: 'ok' | 'stalled' | 'error';
  last_updated: string;
  stages: PipelineStage[];
  error?: string;
}

export default function InternalPipelineDashboard() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/pipeline/status', {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
      setLastFetchTime(new Date());
    } catch (err: any) {
      console.error('[PIPELINE DASHBOARD] Fetch error:', err);
      setError(err.message || 'Failed to fetch pipeline status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Poll every 7 seconds (between 5-10 as requested)
    const interval = setInterval(fetchStatus, 7000);

    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'ok':
        return 'bg-green-500';
      case 'stalled':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'stalled':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const time = new Date(timestamp).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - time) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ago`;
  };

  const getLastUpdatedSeconds = () => {
    if (!lastFetchTime) return 0;
    return Math.floor((Date.now() - lastFetchTime.getTime()) / 1000);
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading pipeline status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Pipeline Control Dashboard</h1>
          <p className="text-gray-400 text-sm">Internal use only — read-only status monitoring</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-500/40 rounded-lg p-4">
            <p className="text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Global Header */}
        {status && (
          <div className="mb-6 bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active Stage */}
              <div>
                <div className="text-sm text-gray-400 mb-1">Active Stage</div>
                <div className="text-lg font-semibold">
                  {status.active_stage || 'None'}
                </div>
              </div>

              {/* Overall Health */}
              <div>
                <div className="text-sm text-gray-400 mb-1">Overall Health</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getHealthColor(status.health)}`} />
                  <span className="text-lg font-semibold capitalize">{status.health}</span>
                </div>
              </div>

              {/* Last Updated */}
              <div>
                <div className="text-sm text-gray-400 mb-1">Last Updated</div>
                <div className="text-lg font-semibold">
                  {getLastUpdatedSeconds()} seconds ago
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning Banner for Errors */}
        {status?.health === 'error' && (
          <div className="mb-6 bg-red-900/40 border border-red-500/40 rounded-lg p-4">
            <p className="text-red-200 font-semibold">⚠️ Pipeline Error Detected</p>
            <p className="text-red-300 text-sm mt-1">Check stage details below for more information.</p>
          </div>
        )}

        {/* Stages Table */}
        {status && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pipeline Stages</h2>
            
            <div className="grid grid-cols-1 gap-4">
              {status.stages.map((stage, index) => (
                <div
                  key={index}
                  className={`
                    bg-gray-900/50 border rounded-lg p-6
                    ${stage.stalled ? 'border-yellow-500/50 bg-yellow-900/10' : ''}
                    ${stage.status === 'error' ? 'border-red-500/50 bg-red-900/10' : ''}
                    ${stage.status === 'running' ? 'border-blue-500/30' : 'border-gray-700'}
                  `}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{stage.name}</h3>
                        <span
                          className={`
                            px-3 py-1 rounded text-xs font-medium border
                            ${getStatusColor(stage.status)}
                          `}
                        >
                          {stage.status.toUpperCase()}
                        </span>
                        {stage.stalled && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            STALLED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white font-medium">{stage.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`
                          h-full transition-all duration-300
                          ${stage.status === 'complete' ? 'bg-green-500' : ''}
                          ${stage.status === 'running' ? 'bg-blue-500' : ''}
                          ${stage.status === 'stalled' ? 'bg-yellow-500' : ''}
                          ${stage.status === 'error' ? 'bg-red-500' : ''}
                          ${stage.status === 'idle' ? 'bg-gray-600' : ''}
                        `}
                        style={{ width: `${Math.min(100, Math.max(0, stage.progress))}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Completed</div>
                      <div className="text-white font-semibold">
                        {stage.completed.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Total</div>
                      <div className="text-white font-semibold">
                        {stage.total > 0 ? stage.total.toLocaleString() : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Rate</div>
                      <div className="text-white font-semibold">
                        {stage.rate_per_minute > 0
                          ? `${stage.rate_per_minute.toLocaleString()}/min`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Last Update</div>
                      <div className="text-white font-semibold text-xs">
                        {formatTimeAgo(stage.last_update)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {status && status.stages.length === 0 && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400">No pipeline stages found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
