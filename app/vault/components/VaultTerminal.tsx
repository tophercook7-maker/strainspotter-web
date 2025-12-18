'use client';

import { useState, useEffect, useRef } from 'react';
import { vaultTheme } from '../vaultTheme';
import clsx from 'clsx';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VaultTerminal({ isOpen, onClose }: TerminalProps) {
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output'; text: string }>>([
    { type: 'output', text: 'Vault Terminal v1.0' },
    { type: 'output', text: 'Type "help" for available commands.' }
  ]);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState('vault');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  if (!isOpen) return null;

  const executeCommand = async (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    setHistory(prev => [...prev, { type: 'input', text: `${currentPath}:~$ ${cmd}` }]);

    try {
      const res = await fetch('/api/vault/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });

      const data = await res.json();
      setHistory(prev => [...prev, { type: 'output', text: data.output || data.error || 'Command executed' }]);
    } catch (error: any) {
      setHistory(prev => [...prev, { type: 'output', text: `Error: ${error.message}` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (input.trim() === 'clear') {
        setHistory([]);
        setInput('');
        return;
      }
      if (input.trim() === 'exit') {
        onClose();
        return;
      }
      executeCommand(input);
      setInput('');
    }
  };

  return (
    <div
      className="fixed bottom-24 right-4 w-[600px] h-[400px] rounded-[var(--radius-md)] border shadow-2xl z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--botanical-bg-deep)',
        borderColor: vaultTheme.colors.border
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: vaultTheme.colors.border }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vaultTheme.colors.error }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vaultTheme.colors.warning }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vaultTheme.colors.success }} />
          <span className="ml-2 text-sm font-mono" style={{ color: vaultTheme.colors.textSecondary }}>
            Terminal
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-sm hover:opacity-80"
          style={{ color: vaultTheme.colors.textSecondary }}
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm"
        style={{ color: 'var(--botanical-accent)' }}
      >
        {history.map((item, idx) => (
          <div key={idx} className="mb-1">
            {item.type === 'input' ? (
              <span style={{ color: '#00FF00' }}>{item.text}</span>
            ) : (
              <span style={{ color: 'var(--botanical-text-primary)' }}>{item.text}</span>
            )}
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2 border-t"
        style={{ borderColor: vaultTheme.colors.border }}
      >
        <span style={{ color: '#00FF00' }}>{currentPath}:~$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none font-mono"
          style={{ color: 'var(--botanical-accent)' }}
          autoFocus
        />
      </div>
    </div>
  );
}
