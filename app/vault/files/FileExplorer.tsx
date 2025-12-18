'use client';

import { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import clsx from 'clsx';
import useSWR, { mutate } from 'swr';
import { vaultTheme } from '../vaultTheme';

interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  created?: string;
  modified?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function DraggableFile({ entry, onClick }: { entry: FileEntry; onClick: () => void }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'vault-file',
    item: { path: entry.path, name: entry.name },
    canDrag: !entry.isDirectory,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef as any}
      onClick={onClick}
      className={clsx(
        'p-3 rounded cursor-pointer border transition',
        isDragging && 'opacity-50'
      )}
      style={{
        backgroundColor: vaultTheme.colors.panelMid,
        borderColor: vaultTheme.colors.border
      }}
    >
      {entry.isDirectory ? (
        <div className="text-4xl mb-2">📁</div>
      ) : entry.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
        <img
          src={`/api/vault/files/read?path=${encodeURIComponent(entry.path)}`}
          alt={entry.name}
          className="w-full h-32 object-cover rounded mb-2"
        />
      ) : (
        <div className="text-4xl mb-2">📄</div>
      )}
      <div className="text-sm font-medium truncate">{entry.name}</div>
      {entry.size && (
        <div className="text-xs mt-1" style={{ color: vaultTheme.colors.textSecondary }}>
          {formatSize(entry.size)}
        </div>
      )}
    </div>
  );
}

function DroppableFolder({ folder, currentPath, onNavigate }: { folder: string; currentPath: string; onNavigate: (path: string) => void }) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: 'vault-file',
    drop: async (item: { path: string; name: string }) => {
      const fileName = item.path.split('/').pop() || item.name;
      const dest = `${folder}/${fileName}`;
      
      try {
        const res = await fetch('/api/vault/files/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: item.path, dest })
        });
        if (!res.ok) throw new Error('Failed to move file');
        mutate(`/api/vault/files/list?path=${encodeURIComponent(currentPath)}`);
        mutate(`/api/vault/files/list?path=${encodeURIComponent(folder)}`);
      } catch (error) {
        console.error('Failed to move file:', error);
        alert('Failed to move file');
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <button
      ref={dropRef as any}
      onClick={() => onNavigate(folder)}
      className={clsx(
        'w-full text-left px-2 py-1 rounded hover:opacity-80 transition',
        isOver && canDrop && 'bg-[var(--botanical-bg-surface)] border border-[var(--botanical-accent)]'
      )}
      style={{
        backgroundColor: currentPath === folder ? vaultTheme.colors.panelMid : 'transparent',
        color: vaultTheme.colors.textPrimary
      }}
    >
      📁 {folder}
    </button>
  );
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default function FileExplorer() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, error, isLoading } = useSWR(
    currentPath ? `/api/vault/files/list?path=${encodeURIComponent(currentPath)}` : '/api/vault/files/list',
    fetcher
  );

  const entries: FileEntry[] = data?.entries || [];

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
      setSelectedEntry(null);
    } else {
      setSelectedEntry(entry);
    }
  };

  const handleBack = () => {
    const segments = currentPath.split('/').filter(Boolean);
    segments.pop();
    setCurrentPath(segments.join('/'));
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Folder Tree */}
      <div
        className="w-64 flex-shrink-0 rounded-[var(--radius-md)] border p-4 overflow-y-auto"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <div className="font-semibold mb-4">Folders</div>
        <div className="space-y-1">
          {['datasets', 'raw', 'synthetic', 'processed', 'manifests', 'clusters', 'logs'].map((folder) => (
            <DroppableFolder
              key={folder}
              folder={folder}
              currentPath={currentPath}
              onNavigate={setCurrentPath}
            />
          ))}
        </div>
      </div>

      {/* Center: File Grid/List */}
      <div
        className="flex-1 rounded-[var(--radius-md)] border p-4 overflow-y-auto"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {currentPath && (
              <button
                onClick={handleBack}
                className="px-3 py-1 rounded hover:opacity-80"
                style={{
                  backgroundColor: vaultTheme.colors.panelMid,
                  color: vaultTheme.colors.textPrimary
                }}
              >
                ← Back
              </button>
            )}
            <div className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
              /{currentPath || 'root'}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'px-3 py-1 rounded text-sm',
                viewMode === 'grid' ? 'opacity-100' : 'opacity-50'
              )}
              style={{
                backgroundColor: viewMode === 'grid' ? vaultTheme.colors.panelMid : 'transparent',
                color: vaultTheme.colors.textPrimary
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'px-3 py-1 rounded text-sm',
                viewMode === 'list' ? 'opacity-100' : 'opacity-50'
              )}
              style={{
                backgroundColor: viewMode === 'list' ? vaultTheme.colors.panelMid : 'transparent',
                color: vaultTheme.colors.textPrimary
              }}
            >
              List
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-4">
            {entries.map((entry) => (
              <DraggableFile
                key={entry.path}
                entry={entry}
                onClick={() => handleEntryClick(entry)}
              />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottomColor: vaultTheme.colors.border }}>
                <th className="text-left py-2 px-4">Name</th>
                <th className="text-left py-2 px-4">Size</th>
                <th className="text-left py-2 px-4">Modified</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.path}
                  onClick={() => handleEntryClick(entry)}
                  className="cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: selectedEntry?.path === entry.path
                      ? vaultTheme.colors.panelLight
                      : 'transparent',
                    borderBottomColor: vaultTheme.colors.border
                  }}
                >
                  <td className="py-2 px-4">
                    {entry.isDirectory ? '📁' : '📄'} {entry.name}
                  </td>
                  <td className="py-2 px-4" style={{ color: vaultTheme.colors.textSecondary }}>
                    {entry.size ? formatSize(entry.size) : '-'}
                  </td>
                  <td className="py-2 px-4" style={{ color: vaultTheme.colors.textSecondary }}>
                    {entry.modified ? new Date(entry.modified).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Right: Inspector Panel */}
      {selectedEntry && (
        <div
          className="w-80 flex-shrink-0 rounded-[var(--radius-md)] border p-4 overflow-y-auto"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          <h3 className="font-semibold mb-4">{selectedEntry.name}</h3>
          
          {selectedEntry.isDirectory ? (
            <div style={{ color: vaultTheme.colors.textSecondary }}>Directory</div>
          ) : selectedEntry.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
            <div>
              <img
                src={`/api/vault/files/read?path=${encodeURIComponent(selectedEntry.path)}`}
                alt={selectedEntry.name}
                className="w-full rounded mb-4"
              />
              <div className="space-y-2 text-sm">
                <div>
                  <span style={{ color: vaultTheme.colors.textSecondary }}>Size: </span>
                  {formatSize(selectedEntry.size || 0)}
                </div>
                {selectedEntry.modified && (
                  <div>
                    <span style={{ color: vaultTheme.colors.textSecondary }}>Modified: </span>
                    {new Date(selectedEntry.modified).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ) : selectedEntry.name.endsWith('.json') ? (
            <div>
              <div className="text-xs font-mono bg-black p-3 rounded overflow-auto max-h-96">
                {/* JSON content would be loaded here */}
                JSON file
              </div>
            </div>
          ) : (
            <div style={{ color: vaultTheme.colors.textSecondary }}>
              No preview available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
