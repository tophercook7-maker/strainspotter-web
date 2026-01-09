'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSelectedGrow } from '@/components/garden/SelectedGrowProvider';

type TimelineItem =
  | { type: 'log'; id: string; text: string; created_at: string; tag?: string | null; label?: string | null; referenced_by_doctor?: boolean }
  | { type: 'scan'; id: string; summary: string; created_at: string; confidence?: number | null; image_url?: string | null; label?: string | null; referenced_by_doctor?: boolean }
  | {
      type: 'measurement';
      id: string;
      created_at: string;
      mtype: string | null;
      value: number | null;
      unit: string | null;
      label?: string;
      referenced_by_doctor?: boolean;
    }
  | { type: 'doctor'; id: string; created_at: string; title: string; confidence?: string | null; status?: string | null; referenced_by_doctor?: boolean };

export default function LogbookPage() {
  const { selectedGrow } = useSelectedGrow();
  const router = useRouter();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entryText, setEntryText] = useState('');
  const [entryTag, setEntryTag] = useState('');
  const [entryLabel, setEntryLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const growId = selectedGrow?.id;

  useEffect(() => {
    if (!growId) return;
    const fetchTimeline = async () => {
      setLoading(true);
      setError(null);
      setTimedOut(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true);
        setLoading(false);
      }, 10000);
      try {
        const res = await fetch(`/api/garden/timeline?grow_id=${growId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load timeline');
        setItems(data.items || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load timeline');
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
      }
    };

    fetchTimeline();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [growId]);

  const handleAddEntry = async () => {
    if (!entryText.trim() || !growId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/garden/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garden_id: growId,
          entry_type: entryTag || 'note',
          text: entryText.trim(),
          label: entryLabel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entry');
      setEntryText('');
      setEntryTag('');
      setShowComposer(false);
      setItems((prev) => [{ type: 'log', ...data.entry, referenced_by_doctor: false }, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const emptyState = useMemo(() => {
    if (items.length > 0) return null;
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/80 space-y-2">
        <p className="font-semibold">This grow’s history will appear here.</p>
        <p className="text-sm text-white/70">Scans, notes, and measurements are recorded together over time.</p>
        <button
          onClick={() => setShowComposer(true)}
          className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
        >
          Add first entry
        </button>
      </div>
    );
  }, [items.length]);

  if (!growId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold text-white">Grow Logbook</h1>
        <p className="text-white/70">The logbook keeps the history of a specific grow.</p>
        <Link
          href="/garden/grows?prompt=Choose%20a%20grow%20for%20Logbook"
          className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
        >
          Select a grow
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Grow Logbook</h1>
          <p className="text-sm text-white/70">
            Unified timeline for {selectedGrow?.name || 'your grow'} — logs, scans, measurements.
          </p>
        </div>
        <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
          ← Back to Garden
        </Link>
        <Link
          href={`/garden/chat?grow_id=${growId || ''}&grow_name=${encodeURIComponent(selectedGrow?.name || 'Grow')}`}
          className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4"
        >
          Garden Chat
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowComposer((s) => !s)}
          className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
        >
          Add entry
        </button>
        <p className="text-xs text-white/60">Log notes to capture changes over time.</p>
      </div>

      {showComposer && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={entryText}
              onChange={(e) => setEntryText(e.target.value)}
              placeholder="Add a quick note..."
              className="flex-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            />
            <input
              value={entryTag}
              onChange={(e) => setEntryTag(e.target.value)}
              placeholder="Tag (optional)"
              className="w-full sm:w-40 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            />
            <input
              value={entryLabel}
              onChange={(e) => setEntryLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full sm:w-48 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            />
            <button
              onClick={handleAddEntry}
              disabled={saving || !entryText.trim()}
              className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save entry'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm text-white">
          <p>We couldn’t save that entry yet.</p>
          <div className="flex gap-2">
            <button
              onClick={handleAddEntry}
              disabled={saving || !entryText.trim()}
              className="px-3 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/70 text-sm">Loading timeline...</div>
      ) : timedOut ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/80 text-sm space-y-2">
          <p className="font-semibold">History will appear when available.</p>
          <p className="text-white/70">Your grow’s history remains intact.</p>
        </div>
      ) : (
        <>
          {emptyState}
          <div className="space-y-3">
            {items.map((item) => (
              <TimelineCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const date = new Date(item.created_at).toLocaleString();
  const badge = item.referenced_by_doctor ? (
    <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/70">
      Referenced by Grow Doctor
    </span>
  ) : null;

  if (item.type === 'log') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
            Note
          </span>
          {item.tag && <span className="text-xs text-white/60">{item.tag}</span>}
          {badge}
          {item.label && <span className="text-[11px] text-white/60 px-2 py-1 rounded-md bg-white/5 border border-white/10">{item.label}</span>}
          <span className="text-xs text-white/50 ml-auto">{date}</span>
        </div>
        <p className="text-white/90 text-sm">{item.text}</p>
      </div>
    );
  }

  if (item.type === 'scan') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
            Scan
          </span>
          {badge}
          <span className="text-xs text-white/50 ml-auto">{date}</span>
        </div>
        <div className="flex gap-3 items-center">
          {item.image_url ? (
            <div className="w-20 h-20 rounded-md overflow-hidden border border-white/10 bg-black/30 flex-shrink-0">
              <img src={item.image_url} alt="Scan thumbnail" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-md border border-white/10 bg-black/20 flex items-center justify-center text-xs text-white/50 flex-shrink-0">
              No image
            </div>
          )}
          <div className="flex-1 space-y-1">
            <p className="text-white/90 text-sm">Scan added to grow history</p>
            {item.summary && <p className="text-xs text-white/60">Match: {item.summary}</p>}
            {item.label && <p className="text-xs text-white/60">Label: {item.label}</p>}
          </div>
          <Link
            href={`/scan/${item.id}`}
            className="text-xs px-3 py-2 rounded-md bg-white/10 text-white border border-white/15 hover:bg-white/15"
          >
            View scan
          </Link>
        </div>
      </div>
    );
  }

  if (item.type === 'measurement') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
            Measurement
          </span>
          {badge}
          <span className="text-xs text-white/50 ml-auto">{date}</span>
        </div>
        <p className="text-white/90 text-sm">
          {item.mtype || 'Value'}: {item.value ?? '—'} {item.unit || ''}
        </p>
        {item.label && <p className="text-xs text-white/60">Label: {item.label}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
          Grow Doctor
        </span>
        {badge}
        <span className="text-xs text-white/50 ml-auto">{date}</span>
      </div>
      <p className="text-white/90 text-sm">{item.title}</p>
      {item.status && <p className="text-xs text-white/60">Status: {item.status}</p>}
      {item.confidence && <p className="text-xs text-white/60">Confidence: {item.confidence}</p>}
    </div>
  );
}

