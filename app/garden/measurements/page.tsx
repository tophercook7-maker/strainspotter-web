'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSelectedGrow } from '@/components/garden/SelectedGrowProvider';

type Measurement = {
  id: string;
  created_at: string;
  type: string | null;
  value: number | null;
  unit: string | null;
};

export default function MeasurementsPage() {
  const { selectedGrow } = useSelectedGrow();
  const [items, setItems] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'pH', value: '', unit: '' });
  const [saving, setSaving] = useState(false);
  const valueRef = useRef<HTMLInputElement | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const growId = selectedGrow?.id;

  const loadMeasurements = async () => {
    if (!growId) return;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, 10000);
    try {
      const res = await fetch(`/api/garden/measurements?grow_id=${growId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load measurements');
      setItems(data.measurements || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load measurements');
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (growId) loadMeasurements();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [growId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!growId) return;
    if (form.value === '') {
      setError('Measurement couldn’t be saved yet.');
      return;
    }
    const numeric = Number(form.value);
    if (Number.isNaN(numeric)) {
      setError('Measurement couldn’t be saved yet.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/garden/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grow_id: growId,
          type: form.type,
          value: numeric,
          unit: form.unit || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save measurement');
      setForm({ type: form.type, value: '', unit: form.unit });
      if (valueRef.current) valueRef.current.focus();
      await loadMeasurements();
    } catch (err: any) {
      setError('Measurement couldn’t be saved yet.');
    } finally {
      setSaving(false);
    }
  };

  const baselines = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    items.forEach((m) => {
      if (!m.type || m.value == null) return;
      const key = m.type.toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m.value);
    });
    const stats: Record<string, { min: number; max: number; avg: number }> = {};
    Object.entries(grouped).forEach(([k, vals]) => {
      if (!vals.length) return;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      stats[k] = { min, max, avg };
    });
    return stats;
  }, [items]);

  const rangeHint = (type: string) => {
    const stats = baselines[type.toLowerCase()];
    if (!stats) return null;
    return `Typical range for this grow: ${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}`;
  };

  if (!growId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold text-white">Measurements</h1>
        <p className="text-white/70">Measurements are recorded per grow for context over time.</p>
        <Link
          href="/garden/grows?prompt=Choose%20a%20grow%20to%20add%20measurements"
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
          <h1 className="text-3xl font-bold text-white">Measurements</h1>
          <p className="text-sm text-white/70">
            Simple inputs tied to {selectedGrow?.name || 'your grow'} with gentle range hints.
          </p>
          <p className="text-xs text-white/60 mt-1">Measurements help provide context over time.</p>
        </div>
        <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
          ← Back to Garden
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-white/70">Type</label>
          <select
            value={form.type}
            onChange={(e) => {
              const nextType = e.target.value;
              const defaultUnit =
                nextType === 'pH' ? '' :
                nextType === 'EC' ? 'mS/cm' :
                nextType === 'Temperature' ? '°C' :
                nextType === 'Humidity' ? '%' :
                nextType === 'Nitrogen' ? 'ppm' : '';
              setForm({ ...form, type: nextType, unit: form.unit || defaultUnit });
            }}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
          >
            <option>pH</option>
            <option>EC</option>
            <option>Temperature</option>
            <option>Humidity</option>
            <option>Nitrogen</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-white/70">Value</label>
          <input
            ref={valueRef}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            placeholder="0.0"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="text-xs text-white/70">Unit</label>
          <input
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="w-full mt-1 rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
            placeholder="°C, %, ppm..."
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save measurement'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm text-white">
          <p>Measurement couldn’t be saved yet.</p>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || form.value === ''}
              className="px-3 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/70 text-sm">Loading measurements...</div>
      ) : timedOut ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/80 text-sm space-y-2">
          <p className="font-semibold">History will appear when available.</p>
          <p className="text-white/70">Your measurements remain intact.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/80 text-sm space-y-2">
          <p>Measurements add helpful context over time.</p>
          <p>Many growers record them occasionally, not constantly.</p>
          <button
            onClick={() => {
              if (valueRef.current) valueRef.current.focus();
            }}
            className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
          >
            Add first measurement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
                  {m.type || 'Value'}
                </span>
                <span className="text-xs text-white/50 ml-auto">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-white/90 text-sm">
                {m.value ?? '—'} {m.unit || ''}
              </p>
              {m.type && rangeHint(m.type) && (
                <p className="text-xs text-white/60">{rangeHint(m.type)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

