'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Combobox } from '@headlessui/react';
import clsx from 'clsx';
import {
  Folder,
  Layers,
  Globe,
  Sparkles,
  Server,
  Grid,
  Cpu,
  Settings,
  Search,
  Play,
  RefreshCw,
  Power
} from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Command {
  id: string;
  label: string;
  href?: string;
  action?: () => void | Promise<void>;
  icon: any;
  category: 'navigation' | 'actions' | 'datasets';
}

export default function VaultCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const { data: datasets } = useSWR('/api/vault/datasets/list', fetcher);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const commands: Command[] = useMemo(() => {
    const nav: Command[] = [
      { id: 'nav-files', label: 'Open Files', href: '/vault/files', icon: Folder, category: 'navigation' },
      { id: 'nav-datasets', label: 'Open Datasets', href: '/vault/datasets', icon: Layers, category: 'navigation' },
      { id: 'nav-scraper', label: 'Open Scraper', href: '/vault/scraper', icon: Globe, category: 'navigation' },
      { id: 'nav-generator', label: 'Open Generator', href: '/vault/generator', icon: Sparkles, category: 'navigation' },
      { id: 'nav-pipeline', label: 'Open Pipeline', href: '/vault/pipeline', icon: Server, category: 'navigation' },
      { id: 'nav-manifests', label: 'Open Manifests', href: '/vault/manifests', icon: Folder, category: 'navigation' },
      { id: 'nav-clusters', label: 'Open Clusters', href: '/vault/clusters', icon: Grid, category: 'navigation' },
      { id: 'nav-ai', label: 'Open AI Monitor', href: '/vault/ai', icon: Cpu, category: 'navigation' },
      { id: 'nav-settings', label: 'Open Settings', href: '/vault/settings', icon: Settings, category: 'navigation' },
    ];

    const actions: Command[] = [
      {
        id: 'action-full-pipeline',
        label: 'Run Full Pipeline',
        action: async () => {
          // TODO: Implement
          alert('Full pipeline started');
        },
        icon: Play,
        category: 'actions'
      },
      {
        id: 'action-start-scraper',
        label: 'Start Scraper Job',
        action: async () => {
          router.push('/vault/scraper');
        },
        icon: Globe,
        category: 'actions'
      },
      {
        id: 'action-start-generator',
        label: 'Start Generator Job',
        action: async () => {
          router.push('/vault/generator');
        },
        icon: Sparkles,
        category: 'actions'
      },
      {
        id: 'action-rebuild-manifest',
        label: 'Rebuild Manifest',
        action: async () => {
          router.push('/vault/manifests');
        },
        icon: RefreshCw,
        category: 'actions'
      },
      {
        id: 'action-rebuild-clusters',
        label: 'Rebuild Clusters',
        action: async () => {
          router.push('/vault/clusters');
        },
        icon: Grid,
        category: 'actions'
      },
      {
        id: 'action-gpu-status',
        label: 'Show GPU Status',
        action: async () => {
          router.push('/vault/ai');
        },
        icon: Cpu,
        category: 'actions'
      },
      {
        id: 'action-restart-gpu',
        label: 'Restart GPU Server',
        action: async () => {
          try {
            await fetch('/api/vault/ai/restart', { method: 'POST' });
            alert('GPU server restart initiated');
          } catch (error) {
            alert('Failed to restart GPU server');
          }
        },
        icon: Power,
        category: 'actions'
      },
    ];

    const datasetCommands: Command[] = (datasets?.strains || []).map((strain: any) => ({
      id: `dataset-${strain.slug}`,
      label: `Open strain: ${strain.name}`,
      href: `/vault/datasets?strain=${strain.slug}`,
      icon: Layers,
      category: 'datasets'
    }));

    return [...nav, ...actions, ...datasetCommands];
  }, [datasets, router]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [query, commands]);

  const handleSelect = (command: Command | null) => {
    if (!command) {
      setOpen(false);
      return;
    }
    if (command.href) {
      router.push(command.href);
    } else if (command.action) {
      command.action();
    }
    setOpen(false);
    setQuery('');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--botanical-blur)] flex items-start justify-center pt-[20vh] z-[100]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-[var(--radius-lg)] border overflow-hidden"
        style={{
          backgroundColor: 'var(--botanical-bg-panel)',
          borderColor: 'var(--botanical-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Combobox value={null} onChange={handleSelect}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--botanical-border)' }}>
            <Search className="h-5 w-5" style={{ color: 'var(--botanical-text-muted)' }} />
            <Combobox.Input
              className="flex-1 bg-transparent outline-none"
              style={{ color: 'var(--botanical-text-primary)' }}
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <kbd className="px-2 py-1 rounded-[var(--radius-sm)] text-xs" style={{ backgroundColor: 'var(--botanical-bg-surface)', color: 'var(--botanical-text-muted)' }}>
              ESC
            </kbd>
          </div>

          <Combobox.Options className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center" style={{ color: 'var(--botanical-text-muted)' }}>
                No commands found
              </div>
            ) : (
              filteredCommands.map((command) => {
                const Icon = command.icon;
                return (
                  <Combobox.Option
                    key={command.id}
                    value={command}
                    className={({ active }) =>
                      clsx(
                        'px-4 py-3 flex items-center gap-3 cursor-pointer',
                        active && 'bg-[var(--botanical-bg-surface)]'
                      )
                    }
                  >
                    <Icon className="h-5 w-5" style={{ color: 'var(--botanical-text-muted)' }} />
                    <span style={{ color: 'var(--botanical-text-primary)' }}>{command.label}</span>
                    <span className="ml-auto text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--botanical-bg-surface)', color: 'var(--botanical-text-muted)' }}>
                      {command.category}
                    </span>
                  </Combobox.Option>
                );
              })
            )}
          </Combobox.Options>
        </Combobox>
      </div>
    </div>
  );
}
