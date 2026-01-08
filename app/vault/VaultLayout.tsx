/**
 * Vault Layout Wrapper
 * Dark OS Panel theme layout
 */

'use client';

import { useEffect, useState } from 'react';
import VaultSidebar from "./components/VaultSidebar";
import VaultSectionBar from "./components/VaultSectionBar";
import VaultDock from "./components/VaultDock";
// TODO: Re-enable VaultCommandPalette after Headless UI combobox fix.
// import VaultCommandPalette from "./components/VaultCommandPalette";
import VaultTerminal from "./components/VaultTerminal";
import VaultSpotlight from "./components/VaultSpotlight";
import VaultVoiceAssistant from "./components/VaultVoiceAssistant";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  const [terminalOpen, setTerminalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Spotlight (⌘Space / Ctrl+Space)
      if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('vault-spotlight-toggle'));
      }

      // Terminal (Ctrl+`)
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] font-[var(--font-primary)]">
      <VaultSidebar />

      <div className="flex flex-col flex-1">
        <VaultSectionBar />
        <div className="flex-1 p-4 pb-24 overflow-y-auto">
          {children}
        </div>
      </div>

      <VaultDock />
      {/* <VaultCommandPalette /> */}
      <VaultTerminal isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
      <VaultSpotlight />
      <VaultVoiceAssistant />
    </div>
  );
}
