'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import clsx from 'clsx';
import {
  Search,
  Folder,
  Layers,
  Globe,
  Sparkles,
  Server,
  Grid,
  Cpu,
  Settings,
  Activity,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { vaultTheme } from '../vaultTheme';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function VaultSpotlight() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const { data: datasets } = useSWR(open ? '/api/vault/datasets/list' : null, fetcher);
  const { data: files } = useSWR(open ? '/api/vault/files/recent' : null, fetcher);
  const { data: queue } = useSWR(open ? '/api/vault/pipeline/queue' : null, fetcher);
  const { data: aiStatus } = useSWR(open ? '/api/vault/ai/status' : null, fetcher);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
        e.preventDefault();
        setOpen(prev => !prev);
        if (!open) {
          setQuery('');
        }
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const toggleHandler = () => {
      setOpen(prev => !prev);
      if (!open) {
        setQuery('');
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('vault-spotlight-toggle', toggleHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('vault-spotlight-toggle', toggleHandler);
    };
  }, [open]);

  const results = useMemo(() => {
    if (!query) return [];

    const q = query.toLowerCase();
    const items: any[] = [];

    // Navigation items
    const navItems = [
      { label: 'Files', href: '/vault/files', icon: Folder },
      { label: 'Datasets', href: '/vault/datasets', icon: Layers },
      { label: 'Scraper', href: '/vault/scraper', icon: Globe },
      { label: 'Generator', href: '/vault/generator', icon: Sparkles },
      { label: 'Pipeline', href: '/vault/pipeline', icon: Server },
      { label: 'Clusters', href: '/vault/clusters', icon: Grid },
      { label: 'AI Monitor', href: '/vault/ai', icon: Cpu },
      { label: 'Mission Control', href: '/vault/mission', icon: Activity },
      { label: 'Settings', href: '/vault/settings', icon: Settings }
    ];

    navItems.forEach(item => {
      if (item.label.toLowerCase().includes(q)) {
        items.push({ ...item, type: 'navigation' });
      }
    });

    // Datasets
    if (datasets?.strains) {
      datasets.strains.forEach((strain: any) => {
        if (strain.name.toLowerCase().includes(q) || strain.slug.toLowerCase().includes(q)) {
          items.push({
            label: `Strain: ${strain.name}`,
            href: `/vault/datasets?strain=${strain.slug}`,
            icon: Layers,
            type: 'dataset',
            strain: strain
          });
        }
      });
    }

    // Recent files
    if (files?.files) {
      files.files.slice(0, 5).forEach((file: any) => {
        if (file.name.toLowerCase().includes(q)) {
          items.push({
            label: file.name,
            href: `/vault/files?path=${encodeURIComponent(file.path)}`,
            icon: file.name.match(/\.(jpg|jpeg|png|webp)$/i) ? ImageIcon : FileText,
            type: 'file'
          });
        }
      });
    }

    // Quick actions
    if (q.includes('jump') || q.includes('go')) {
      items.push(
        { label: 'Jump to Dataset', href: '/vault/datasets', icon: Layers, type: 'action' },
        { label: 'Jump to Cluster', href: '/vault/clusters', icon: Grid, type: 'action' },
        { label: 'Jump to Manifest', href: '/vault/manifests', icon: FileText, type: 'action' }
      );
    }

    return items.slice(0, 10);
  }, [query, datasets, files]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--botanical-blur)] backdrop-blur-md flex items-start justify-center pt-[15vh] z-[100]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-3xl mx-4 rounded-[var(--radius-lg)] border overflow-hidden"
        style={{
          backgroundColor: 'var(--botanical-bg-panel)',
          borderColor: 'var(--botanical-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: vaultTheme.colors.border }}>
          <Search className="h-6 w-6" style={{ color: vaultTheme.colors.textSecondary }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-xl"
            style={{ color: vaultTheme.colors.textPrimary }}
            placeholder="Search strains, files, commands..."
            autoFocus
          />
          <kbd className="px-2 py-1 rounded text-xs" style={{ backgroundColor: vaultTheme.colors.panelMid, color: vaultTheme.colors.textSecondary }}>
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-6 py-12 text-center" style={{ color: vaultTheme.colors.textSecondary }}>
              {query ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            <div className="py-2">
              {results.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-4 px-6 py-4 hover:opacity-80 transition',
                      idx === 0 && 'bg-[var(--botanical-bg-surface)]'
                    )}
                  >
                    <Icon className="h-6 w-6" style={{ color: vaultTheme.colors.textSecondary }} />
                    <div className="flex-1 text-left">
                      <div style={{ color: vaultTheme.colors.textPrimary }}>{item.label}</div>
                      {item.strain && (
                        <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                          {item.strain.real} real, {item.strain.synthetic} synthetic
                        </div>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: vaultTheme.colors.panelMid, color: vaultTheme.colors.textSecondary }}>
                      {item.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
