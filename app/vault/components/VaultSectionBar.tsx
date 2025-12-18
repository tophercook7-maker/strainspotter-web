'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { vaultTheme } from '../vaultTheme';

interface Tab {
  id: string;
  label: string;
}

const sectionTabs: Record<string, Tab[]> = {
  '/vault/files': [
    { id: 'all', label: 'All' },
    { id: 'images', label: 'Images' },
    { id: 'manifests', label: 'Manifests' },
    { id: 'logs', label: 'Logs' }
  ],
  '/vault/datasets': [
    { id: 'strains', label: 'Strains' },
    { id: 'health', label: 'Health' },
    { id: 'missing', label: 'Missing' },
    { id: 'pipeline', label: 'Pipeline' }
  ],
  '/vault/scraper': [
    { id: 'controls', label: 'Controls' },
    { id: 'queue', label: 'Queue' },
    { id: 'logs', label: 'Logs' },
    { id: 'settings', label: 'Settings' }
  ],
  '/vault/generator': [
    { id: 'generate', label: 'Generate' },
    { id: 'preview', label: 'Preview' },
    { id: 'logs', label: 'Logs' }
  ],
  '/vault/pipeline': [
    { id: 'queue', label: 'Queue' },
    { id: 'history', label: 'History' }
  ],
  '/vault/manifests': [
    { id: 'browse', label: 'Browse' },
    { id: 'rebuild', label: 'Rebuild' }
  ],
  '/vault/clusters': [
    { id: 'view', label: 'View' },
    { id: 'regenerate', label: 'Regenerate' }
  ],
  '/vault/ai': [
    { id: 'status', label: 'Status' },
    { id: 'restart', label: 'Restart' },
    { id: 'metrics', label: 'Metrics' }
  ],
  '/vault/settings': [
    { id: 'general', label: 'General' },
    { id: 'paths', label: 'Paths' },
    { id: 'advanced', label: 'Advanced' }
  ]
};

export default function VaultSectionBar() {
  const pathname = usePathname();
  const tabs = sectionTabs[pathname] || [];

  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id || '');

  React.useEffect(() => {
    if (tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [pathname]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className="h-12 flex items-center gap-1 px-4 border-b"
      style={{
        backgroundColor: vaultTheme.colors.panelMid,
        borderColor: vaultTheme.colors.border
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-[var(--motion-fast)] ease-[var(--motion-smooth)] ${
            activeTab === tab.id ? '' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: activeTab === tab.id ? vaultTheme.colors.panelLight : 'transparent',
            color: activeTab === tab.id ? vaultTheme.colors.textPrimary : vaultTheme.colors.textSecondary
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
