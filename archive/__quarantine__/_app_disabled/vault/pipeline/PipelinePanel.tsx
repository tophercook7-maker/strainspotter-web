'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

interface PipelineJob {
  id: string;
  type: string;
  strain: string;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export default function PipelinePanel() {
  const [queue, setQueue] = useState<PipelineJob[]>([]);
  const [history, setHistory] = useState<PipelineJob[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'queue') {
        const res = await fetch('/api/vault/pipeline/queue');
        if (!res.ok) throw new Error('Failed to load queue');
        const data = await res.json();
        setQueue(data.queue || []);
      } else {
        const res = await fetch('/api/vault/pipeline/history');
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/vault/pipeline/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      if (!res.ok) throw new Error('Failed to cancel job');
      loadData();
    } catch (error: any) {
      alert(`Failed to cancel job: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return vaultTheme.colors.success;
      case 'running':
        return vaultTheme.colors.accent;
      case 'failed':
        return vaultTheme.colors.error;
      default:
        return vaultTheme.colors.textSecondary;
    }
  };

  const jobs = activeTab === 'queue' ? queue : history;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Pipeline Orchestrator</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div
          className="rounded-[var(--radius-md)] border overflow-hidden"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 border-b"
              style={{ borderColor: vaultTheme.colors.border }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStatusColor(job.status) }}
                    />
                    <span className="font-medium">{job.strain}</span>
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: vaultTheme.colors.panelMid,
                        color: vaultTheme.colors.textSecondary
                      }}
                    >
                      {job.type}
                    </span>
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: getStatusColor(job.status) + '20',
                        color: getStatusColor(job.status)
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  {job.error && (
                    <div className="mt-2 text-sm" style={{ color: vaultTheme.colors.error }}>
                      Error: {job.error}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {job.status === 'queued' && (
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="px-3 py-1 rounded text-sm hover:opacity-80"
                      style={{
                        backgroundColor: vaultTheme.colors.error,
                        color: 'white'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="px-3 py-1 rounded text-sm hover:opacity-80"
                    style={{
                      backgroundColor: vaultTheme.colors.panelMid,
                      color: vaultTheme.colors.textPrimary
                    }}
                  >
                    Logs
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
