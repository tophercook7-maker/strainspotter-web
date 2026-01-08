'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelectedGrow } from '@/components/garden/SelectedGrowProvider';

type Grow = {
  id: string;
  strain_name?: string | null;
  name?: string | null;
  medium?: string | null;
  start_date?: string | null;
  stage?: string | null;
  created_at?: string;
};

type StatusOption = 'Active' | 'Paused' | 'Completed';

type GrowFormState = {
  name: string;
  medium: string;
  start_date: string;
  status: StatusOption;
  notes?: string;
};

export default function MyGrowsPage() {
  const { selectedGrow, setSelectedGrow } = useSelectedGrow();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<GrowFormState>({ name: '', medium: '', start_date: '', status: 'Active', notes: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; status: StatusOption }>({
    name: '',
    status: 'Active',
  });
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fetchGrows = async () => {
      setLoading(true);
      setError(null);
      setTimedOut(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true);
        setLoading(false);
      }, 10000);
      try {
        const res = await fetch('/api/garden/grows');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load grows');
        }
        const data = await res.json();
        setGrows(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load grows');
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
      }
    };

    fetchGrows();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const statusFromStage = (stage?: string | null): StatusOption => {
    const s = (stage || '').toLowerCase();
    if (s === 'paused') return 'Paused';
    if (s === 'harvest' || s === 'completed') return 'Completed';
    return 'Active';
  };

  const stageFromStatus = (status: StatusOption) => {
    if (status === 'Completed') return 'completed';
    if (status === 'Paused') return 'paused';
    return 'active';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('We couldn’t create this grow yet.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/garden/grows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          strain_name: form.name.trim(),
          medium: form.medium || null,
          start_date: form.start_date || undefined,
          status: stageFromStatus(form.status),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create grow');
      }
      setGrows((prev) => [data, ...prev]);
      setForm({ name: '', medium: '', start_date: '', status: 'Active', notes: '' });
      setSelectedGrow({ id: data.id, name: data.strain_name || data.name || form.name, stage: data.stage });
    } catch (err: any) {
      setError(err.message || 'Failed to create grow');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (grow: Grow) => {
    setEditingId(grow.id);
    setEditDraft({
      name: grow.strain_name || grow.name || '',
      status: statusFromStage(grow.stage),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/garden/grows/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name,
          status: stageFromStatus(editDraft.status),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update grow');
      }
      setGrows((prev) => prev.map((g) => (g.id === editingId ? data.grow || data : g)));
      if (selectedGrow?.id === editingId) {
        setSelectedGrow({ id: editingId, name: editDraft.name || selectedGrow.name, stage: data.grow?.stage || data.stage });
      }
      setEditingId(null);
    } catch (err: any) {
      setError('We couldn’t create this grow yet.');
    } finally {
      setSaving(false);
    }
  };

  const prompt = useMemo(() => searchParams.get('prompt') || '', [searchParams]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">My Grows</h1>
          <p className="text-sm text-white/70">
            Track your grows with clear status. Select one to use across Logbook, Measurements, and Scan.
          </p>
          {prompt && <p className="mt-2 text-amber-200 text-sm">{prompt}</p>}
        </div>
        <Link
          href="/garden"
          className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4"
        >
          ← Back to Garden
        </Link>
      </div>

      <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-white/70">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            placeholder="e.g., Northern Lights Tent"
          />
        </div>
        <div>
          <label className="text-xs text-white/70">Medium</label>
          <input
            value={form.medium}
            onChange={(e) => setForm({ ...form, medium: e.target.value })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            placeholder="Coco / Soil / Hydro"
          />
        </div>
        <div>
          <label className="text-xs text-white/70">Start Date</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-white/70">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as StatusOption })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
          >
            <option>Active</option>
            <option>Paused</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="text-xs text-white/70">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            rows={2}
            placeholder="Any context you want to remember."
          />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Create Grow'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-100 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-white/70 text-sm">Loading grows...</div>
      ) : grows.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/80 text-sm">
          No grows yet. Create your first grow to unlock Logbook and Measurements.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grows.map((grow) => {
            const status = statusFromStage(grow.stage);
            const isSelected = selectedGrow?.id === grow.id;
            return (
              <div
                key={grow.id}
                className={`rounded-lg border ${isSelected ? 'border-emerald-400/70' : 'border-white/15'} bg-white/5 p-4 space-y-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {grow.strain_name || grow.name || 'Untitled Grow'}
                      </h3>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-xs text-white/60">
                      Medium: {grow.medium || '—'} · Started: {grow.start_date || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedGrow({ id: grow.id, name: grow.strain_name || grow.name || 'Untitled', stage: grow.stage });
                      }}
                      className={`px-3 py-1 rounded-md text-sm font-semibold ${
                        isSelected ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                    <button
                      onClick={() => startEdit(grow)}
                      className="px-3 py-1 rounded-md text-sm bg-white/10 text-white hover:bg-white/15"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {editingId === grow.id && (
                  <div className="space-y-3 bg-black/30 border border-white/10 rounded-md p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-white/70">Name</label>
                        <input
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/70">Strain name (optional)</label>
                        <input
                          value={editDraft.strain_name}
                          onChange={(e) => setEditDraft({ ...editDraft, strain_name: e.target.value })}
                          className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/70">Status</label>
                        <select
                          value={editDraft.status}
                          onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as StatusOption })}
                          className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        >
                          <option>Active</option>
                          <option>Paused</option>
                          <option>Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/70">Medium</label>
                        <input
                          value={editDraft.medium}
                          onChange={(e) => setEditDraft({ ...editDraft, medium: e.target.value })}
                          className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/70">Source</label>
                        <select
                          value={editDraft.source}
                          onChange={(e) => setEditDraft({ ...editDraft, source: e.target.value })}
                          className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        >
                          <option value="seed">Seed</option>
                          <option value="clone">Clone</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/70">Notes (optional)</label>
                      <textarea
                        value={editDraft.notes}
                        onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                        className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 rounded-md text-sm bg-white/10 text-white hover:bg-white/15"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving}
                        className="px-3 py-2 rounded-md text-sm bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: StatusOption }) {
  const color =
    status === 'Completed' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' :
    status === 'Paused' ? 'bg-amber-500/20 text-amber-200 border-amber-400/40' :
    'bg-cyan-500/20 text-cyan-200 border-cyan-400/40';

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${color}`}>
      {status}
    </span>
  );
}

