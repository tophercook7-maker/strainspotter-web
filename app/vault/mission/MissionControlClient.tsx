'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { vaultTheme } from '../vaultTheme';
import {
  Cpu,
  Server,
  Globe,
  Sparkles,
  HardDrive,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Monitor,
  Mic,
  Power
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MissionControlClient() {
  const { data: systemStatus } = useSWR('/api/vault/mission/status', fetcher, {
    refreshInterval: 2000
  });
  const { data: events } = useSWR('/api/vault/mission/events', fetcher, {
    refreshInterval: 1000
  });
  const { data: watchdogStatus } = useSWR('/api/vault/ai/watchdog/status', fetcher, {
    refreshInterval: 2000
  });

  const status = systemStatus || {
    gpu: { status: 'offline', latency: 0 },
    embedding_latency: 0,
    queue_depth: 0,
    scraper: { status: 'idle', running: false },
    generator: { status: 'idle', running: false },
    vault: { total_size: 0, strains: 0, images: 0 },
    missing_datasets: []
  };

  const recentEvents = events?.events || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mission Control</h1>

      {/* System Status Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatusCard
          icon={Cpu}
          label="GPU Server"
          value={status.gpu?.status === 'online' ? 'Online' : 'Offline'}
          status={status.gpu?.status === 'online' ? 'success' : 'error'}
        />
        <StatusCard
          icon={Activity}
          label="Embedding Latency"
          value={`${status.embedding_latency || 0}ms`}
          status={status.embedding_latency < 100 ? 'success' : status.embedding_latency < 500 ? 'warning' : 'error'}
        />
        <StatusCard
          icon={Server}
          label="Queue Depth"
          value={status.queue_depth || 0}
          status={status.queue_depth === 0 ? 'success' : status.queue_depth < 5 ? 'warning' : 'error'}
        />
        <StatusCard
          icon={Globe}
          label="Scraper"
          value={status.scraper?.running ? 'Running' : 'Idle'}
          status={status.scraper?.running ? 'success' : 'idle'}
        />
        <StatusCard
          icon={Sparkles}
          label="Generator"
          value={status.generator?.running ? 'Running' : 'Idle'}
          status={status.generator?.running ? 'success' : 'idle'}
        />
        <StatusCard
          icon={HardDrive}
          label="Vault Storage"
          value={formatBytes(status.vault?.total_size || 0)}
          status="success"
        />
        <StatusCard
          icon={Activity}
          label="Total Strains"
          value={status.vault?.strains || 0}
          status="success"
        />
        <StatusCard
          icon={Activity}
          label="Total Images"
          value={formatBytes(status.vault?.images || 0)}
          status="success"
        />
        <StatusCard
          icon={AlertCircle}
          label="Missing Datasets"
          value={status.missing_datasets?.length || 0}
          status={status.missing_datasets?.length === 0 ? 'success' : 'warning'}
        />
      </div>

      {/* Live Jobs Panel */}
      <div
        className="rounded-[var(--radius-md)] border p-6"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4">Live Jobs</h2>
        <div className="space-y-2">
          {status.active_jobs?.map((job: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded"
              style={{ backgroundColor: vaultTheme.colors.panelMid }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      job.status === 'running' ? vaultTheme.colors.accent :
                      job.status === 'failed' ? vaultTheme.colors.error :
                      vaultTheme.colors.success
                  }}
                />
                <span className="font-medium">{job.type}</span>
                <span style={{ color: vaultTheme.colors.textSecondary }}>{job.strain}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                  {job.status}
                </span>
                {job.progress && (
                  <div className="w-32 h-2 rounded-full" style={{ backgroundColor: vaultTheme.colors.panelLight }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${job.progress}%`,
                        backgroundColor: vaultTheme.colors.accent
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )) || (
            <div style={{ color: vaultTheme.colors.textSecondary }}>No active jobs</div>
          )}
        </div>
      </div>

      {/* GPU Watchdog Tile */}
      <div
        className="rounded-[var(--radius-md)] border p-6"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Power className="h-5 w-5" />
          GPU Watchdog
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ color: vaultTheme.colors.textSecondary }}>Status:</span>
            <span style={{ color: watchdogStatus?.running ? vaultTheme.colors.success : vaultTheme.colors.error }}>
              {watchdogStatus?.running ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: vaultTheme.colors.textSecondary }}>Auto-restart:</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={watchdogStatus?.autoRestartEnabled || false}
                onChange={async (e) => {
                  await fetch('/api/vault/ai/watchdog/autorestart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: e.target.checked })
                  });
                }}
              />
              <span style={{ color: vaultTheme.colors.textPrimary }}>
                {watchdogStatus?.autoRestartEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          {watchdogStatus?.lastRestart && (
            <div className="flex items-center justify-between">
              <span style={{ color: vaultTheme.colors.textSecondary }}>Last restart:</span>
              <span style={{ color: vaultTheme.colors.textPrimary }}>
                {new Date(watchdogStatus.lastRestart).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span style={{ color: vaultTheme.colors.textSecondary }}>Restart count:</span>
            <span style={{ color: vaultTheme.colors.textPrimary }}>
              {watchdogStatus?.restartCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Remote Desktop Tile */}
      <div
        className="rounded-[var(--radius-md)] border p-6"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Remote Desktop
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ color: vaultTheme.colors.textSecondary }}>Active streams:</span>
            <span style={{ color: vaultTheme.colors.textPrimary }}>0</span>
          </div>
          <button
            onClick={() => window.location.href = '/vault/remote'}
            className="w-full px-4 py-2 rounded hover:opacity-80"
            style={{
              backgroundColor: vaultTheme.colors.accent,
              color: 'white'
            }}
          >
            Open Remote Desktop
          </button>
        </div>
      </div>

      {/* Voice Assistant Tile */}
      <div
        className="rounded-[var(--radius-md)] border p-6"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Assistant
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ color: vaultTheme.colors.textSecondary }}>Status:</span>
            <span style={{ color: vaultTheme.colors.textSecondary }}>Ready</span>
          </div>
          <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
            Press ⌘⇧V to activate
          </div>
        </div>
      </div>

      {/* Events Feed */}
      <div
        className="rounded-[var(--radius-md)] border p-6"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4">Events Feed</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentEvents.map((event: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2 rounded text-sm"
              style={{ backgroundColor: vaultTheme.colors.panelMid }}
            >
              <Clock className="h-4 w-4" style={{ color: vaultTheme.colors.textSecondary }} />
              <span style={{ color: vaultTheme.colors.textSecondary }}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span>{event.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, status }: {
  icon: any;
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error' | 'idle';
}) {
  const statusColor = {
    success: vaultTheme.colors.success,
    warning: vaultTheme.colors.warning,
    error: vaultTheme.colors.error,
    idle: vaultTheme.colors.textSecondary
  };

  return (
    <div
      className="rounded-[var(--radius-md)] border p-4"
      style={{
        backgroundColor: vaultTheme.colors.panelDark,
        borderColor: vaultTheme.colors.border
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5" style={{ color: statusColor[status] }} />
        <span className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: statusColor[status] }}>
        {value}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
