'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Monitor, Bot, Box, Book } from 'lucide-react';
import { vaultTheme } from '../vaultTheme';

const sections = [
  { href: '/vault', label: 'Dashboard', icon: '📊', isComponent: false },
  { href: '/vault/files', label: 'Files', icon: '📁', isComponent: false },
  { href: '/vault/datasets', label: 'Datasets', icon: '🗂️', isComponent: false },
  { href: '/vault/scraper', label: 'Scraper', icon: '🕷️', isComponent: false },
  { href: '/vault/generator', label: 'Generator', icon: '🎨', isComponent: false },
  { href: '/vault/pipeline', label: 'Pipeline', icon: '⚙️', isComponent: false },
  { href: '/vault/manifests', label: 'Manifests', icon: '📋', isComponent: false },
  { href: '/vault/clusters', label: 'Clusters', icon: '🔗', isComponent: false },
  { href: '/vault/ai', label: 'AI', icon: '🤖', isComponent: false },
  { href: '/vault/mission', label: 'Mission Control', icon: Activity, isComponent: true },
  { href: '/vault/agents', label: 'AI Agents', icon: Bot, isComponent: true },
  { href: '/vault/models', label: 'Model Zoo', icon: Box, isComponent: true },
  { href: '/vault/notebooks', label: 'Notebooks', icon: Book, isComponent: true },
  { href: '/vault/remote', label: 'Remote Desktop', icon: Monitor, isComponent: true },
  { href: '/vault/settings', label: 'Settings', icon: '⚙️', isComponent: false }
];

export default function VaultSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 flex-shrink-0 border-r"
      style={{
        backgroundColor: vaultTheme.colors.panelDark,
        borderColor: vaultTheme.colors.border
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src="/brand/logos/botanical-logo-mark.svg" 
            alt="Vault" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold" style={{ color: vaultTheme.colors.textPrimary }}>
            The Vault
          </h1>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => {
            const isActive = pathname === section.href || 
              (section.href !== '/vault' && pathname.startsWith(section.href));
            
            return (
              <Link
                key={section.href}
                href={section.href}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-smooth)] ${
                  isActive ? '' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isActive ? vaultTheme.colors.panelMid : 'transparent',
                  color: isActive ? vaultTheme.colors.accent : vaultTheme.colors.textSecondary
                }}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r"
                    style={{ backgroundColor: vaultTheme.colors.accent }}
                  />
                )}
                {section.isComponent ? (
                  <section.icon className="h-5 w-5" />
                ) : typeof section.icon === 'string' ? (
                  <span className="text-lg">{section.icon}</span>
                ) : (
                  <section.icon className="h-5 w-5" />
                )}
                <span className="font-medium">{section.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
