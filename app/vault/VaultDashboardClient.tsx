'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { vaultTheme } from './vaultTheme';

export default function VaultDashboardClient() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/vault/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <div>Loading vault statistics...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Vault Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div
          className="p-6 rounded-[var(--radius-md)] border"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
            Total Storage
          </div>
          <div className="text-2xl font-bold">
            {stats ? formatSize(
              (stats.datasets?.size || 0) +
              (stats.raw?.size || 0) +
              (stats.synthetic?.size || 0)
            ) : '0 B'}
          </div>
        </div>

        <div
          className="p-6 rounded-[var(--radius-md)] border"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
            Strains
          </div>
          <div className="text-2xl font-bold">
            {stats?.strains?.datasets || 0}
          </div>
        </div>

        <div
          className="p-6 rounded-[var(--radius-md)] border"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
            Manifests
          </div>
          <div className="text-2xl font-bold">
            {stats?.manifests?.count || 0}
          </div>
        </div>

        <div
          className="p-6 rounded-[var(--radius-md)] border"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textSecondary }}>
            Clusters
          </div>
          <div className="text-2xl font-bold">
            {stats?.clusters?.count || 0}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/vault/files"
          className="p-6 rounded-[var(--radius-md)] border hover:opacity-80 transition"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-2xl mb-2">📁</div>
          <div className="font-semibold">File Explorer</div>
          <div className="text-sm mt-1" style={{ color: vaultTheme.colors.textSecondary }}>
            Browse vault contents
          </div>
        </Link>

        <Link
          href="/vault/pipeline"
          className="p-6 rounded-[var(--radius-md)] border hover:opacity-80 transition"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-2xl mb-2">⚙️</div>
          <div className="font-semibold">Pipeline</div>
          <div className="text-sm mt-1" style={{ color: vaultTheme.colors.textSecondary }}>
            Manage pipeline jobs
          </div>
        </Link>

        <Link
          href="/vault/ai"
          className="p-6 rounded-[var(--radius-md)] border hover:opacity-80 transition"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <div className="text-2xl mb-2">🤖</div>
          <div className="font-semibold">AI Monitor</div>
          <div className="text-sm mt-1" style={{ color: vaultTheme.colors.textSecondary }}>
            GPU server status
          </div>
        </Link>
      </div>
    </div>
  );
}
