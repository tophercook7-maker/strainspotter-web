'use client';

import { useState, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';
import { Book, Play, Save, FolderOpen, X } from 'lucide-react';

interface Cell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
  output?: string;
  error?: string;
}

export default function NotebooksClient() {
  const [cells, setCells] = useState<Cell[]>([
    { id: '1', type: 'code', content: '# Access vault files\nimport os\n\nVAULT_PATH = os.getenv("VAULT_PATH")\nprint(f"Vault path: {VAULT_PATH}")' }
  ]);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  const addCell = (type: 'code' | 'markdown' = 'code') => {
    const newCell: Cell = {
      id: Date.now().toString(),
      type,
      content: ''
    };
    setCells([...cells, newCell]);
    setSelectedCell(newCell.id);
  };

  const executeCell = async (cellId: string) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') return;

    setExecuting(cellId);
    
    try {
      const res = await fetch('/api/vault/notebook/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cell.content })
      });

      const data = await res.json();

      setCells(cells.map(c => 
        c.id === cellId 
          ? { ...c, output: data.output || '', error: data.error || data.error || null }
          : c
      ));
    } catch (error: any) {
      setCells(cells.map(c => 
        c.id === cellId 
          ? { ...c, error: error.message }
          : c
      ));
    } finally {
      setExecuting(null);
    }
  };

  const deleteCell = (cellId: string) => {
    setCells(cells.filter(c => c.id !== cellId));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Book className="h-8 w-8" />
          Notebooks
        </h1>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80"
            style={{
              backgroundColor: vaultTheme.colors.panelMid,
              color: vaultTheme.colors.textPrimary
            }}
          >
            <FolderOpen className="h-4 w-4" />
            Load
          </button>
          <button
            className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80"
            style={{
              backgroundColor: vaultTheme.colors.accent,
              color: 'white'
            }}
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {cells.map((cell) => (
          <div
            key={cell.id}
            className="rounded-[var(--radius-md)] border"
            style={{
              backgroundColor: vaultTheme.colors.panelDark,
              borderColor: vaultTheme.colors.border
            }}
          >
            <div className="flex items-center justify-between p-2 border-b" style={{ borderColor: vaultTheme.colors.border }}>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: vaultTheme.colors.panelMid }}>
                  {cell.type}
                </span>
                {cell.type === 'code' && (
                  <button
                    onClick={() => executeCell(cell.id)}
                    disabled={executing === cell.id}
                    className="px-2 py-1 rounded text-xs hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
                    style={{
                      backgroundColor: vaultTheme.colors.accent,
                      color: 'white'
                    }}
                  >
                    <Play className="h-3 w-3" />
                    Run
                  </button>
                )}
              </div>
              <button
                onClick={() => deleteCell(cell.id)}
                className="p-1 hover:opacity-80"
                style={{ color: vaultTheme.colors.textSecondary }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={cell.content}
              onChange={(e) => setCells(cells.map(c => 
                c.id === cell.id ? { ...c, content: e.target.value } : c
              ))}
              className="w-full p-4 font-mono text-sm outline-none resize-none"
              style={{
                backgroundColor: vaultTheme.colors.bgDeep,
                color: vaultTheme.colors.textPrimary,
                minHeight: '100px'
              }}
              placeholder={cell.type === 'code' ? '# Python code...' : 'Markdown content...'}
            />

            {cell.output && (
              <div className="p-4 border-t font-mono text-sm" style={{ borderColor: vaultTheme.colors.border }}>
                <div style={{ color: vaultTheme.colors.textPrimary }}>{cell.output}</div>
              </div>
            )}

            {cell.error && (
              <div className="p-4 border-t font-mono text-sm" style={{ borderColor: vaultTheme.colors.border }}>
                <div style={{ color: vaultTheme.colors.error }}>{cell.error}</div>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => addCell('code')}
          className="w-full p-4 rounded-[var(--radius-md)] border border-dashed hover:opacity-80"
          style={{
            borderColor: vaultTheme.colors.border,
            color: vaultTheme.colors.textSecondary
          }}
        >
          + Add Code Cell
        </button>
      </div>
    </div>
  );
}
