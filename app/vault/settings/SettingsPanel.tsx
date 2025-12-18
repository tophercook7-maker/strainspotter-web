'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';

interface VaultSettings {
  vault_path: string;
  embedding_server_url: string;
  max_concurrent_jobs: number;
  auto_process: boolean;
  log_retention_days: number;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/vault/settings/get');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const res = await fetch('/api/vault/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('Settings saved successfully');
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>Failed to load settings</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Vault Settings</h1>

      <div
        className="rounded-[var(--radius-md)] border p-6 max-w-2xl"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Vault Path</label>
            <input
              type="text"
              value={settings.vault_path}
              onChange={(e) => setSettings({ ...settings, vault_path: e.target.value })}
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary,
                borderColor: vaultTheme.colors.border
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Embedding Server URL</label>
            <input
              type="text"
              value={settings.embedding_server_url}
              onChange={(e) => setSettings({ ...settings, embedding_server_url: e.target.value })}
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary,
                borderColor: vaultTheme.colors.border
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Max Concurrent Jobs</label>
            <input
              type="number"
              value={settings.max_concurrent_jobs}
              onChange={(e) => setSettings({ ...settings, max_concurrent_jobs: parseInt(e.target.value) })}
              min="1"
              max="10"
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary,
                borderColor: vaultTheme.colors.border
              }}
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auto_process}
                onChange={(e) => setSettings({ ...settings, auto_process: e.target.checked })}
              />
              Auto-process after scraping/generation
            </label>
          </div>

          <div>
            <label className="block text-sm mb-2">Log Retention (days)</label>
            <input
              type="number"
              value={settings.log_retention_days}
              onChange={(e) => setSettings({ ...settings, log_retention_days: parseInt(e.target.value) })}
              min="1"
              max="365"
              className="w-full px-3 py-2 rounded"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary,
                borderColor: vaultTheme.colors.border
              }}
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 rounded hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: vaultTheme.colors.accent,
              color: 'white'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
