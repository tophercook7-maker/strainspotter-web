'use client';

import { useEffect, useMemo, useState } from 'react';

type SessionEntry = {
  id: string;
  created_at: string;
  product?: string;
  strain?: string;
  felt?: string;
  effects?: string[];
};

const EFFECT_OPTIONS = ['Calm', 'Uplift', 'Focus', 'Rest', 'Body feel', 'Appetite change', 'Other'];

export default function SessionJournalPage() {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [product, setProduct] = useState('flower');
  const [strain, setStrain] = useState('');
  const [felt, setFelt] = useState('');
  const [effects, setEffects] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('session_journal');
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveLocal = (list: SessionEntry[]) => {
    setEntries(list);
    try {
      localStorage.setItem('session_journal', JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleToggleEffect = (effect: string) => {
    setEffects((prev) => (prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]));
  };

  const handleAdd = () => {
    const entry: SessionEntry = {
      id: crypto.randomUUID(),
      created_at: createdAt || new Date().toISOString(),
      product: product || undefined,
      strain: strain || undefined,
      felt: felt || undefined,
      effects,
    };
    const list = [entry, ...entries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    saveLocal(list);
    setFelt('');
    setStrain('');
    setEffects([]);
    setCreatedAt(new Date().toISOString().slice(0, 16));
  };

  const handleReflect = async () => {
    setAiReply(null);
    setAiStatus(null);
    try {
      const res = await fetch('/api/garden/sessions/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (res.ok && data?.reply) {
        setAiReply(data.reply);
      } else {
        setAiStatus('Reflection will be available when the Garden is ready.');
      }
    } catch {
      setAiStatus('Reflection will be available when the Garden is ready.');
    }
  };

  const excerpt = (text?: string) => {
    if (!text) return '';
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  };

  const chronological = useMemo(
    () => entries.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [entries]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Session Journal</h1>
            <p className="text-sm text-white/70">Private notes about your experiences over time.</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold text-white">Add session</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-white/70 space-y-1">
              <span>Date / time</span>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
              />
            </label>
            <label className="text-xs text-white/70 space-y-1">
              <span>Product type (optional)</span>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
              >
                <option value="flower">Flower</option>
                <option value="edible">Edible</option>
                <option value="concentrate">Concentrate</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-xs text-white/70 space-y-1 sm:col-span-2">
              <span>Strain name (optional)</span>
              <input
                value={strain}
                onChange={(e) => setStrain(e.target.value)}
                className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                placeholder="e.g., Blue Dream"
              />
            </label>
            <label className="text-xs text-white/70 space-y-1 sm:col-span-2">
              <span>How it felt (optional)</span>
              <textarea
                value={felt}
                onChange={(e) => setFelt(e.target.value)}
                className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                rows={3}
                placeholder="Freeform notes—observations only."
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-white/70">Effects noticed (optional, choose any)</p>
            <div className="flex flex-wrap gap-2">
              {EFFECT_OPTIONS.map((effect) => (
                <button
                  type="button"
                  key={effect}
                  onClick={() => handleToggleEffect(effect)}
                  className={`px-3 py-1 rounded-md border text-xs ${
                    effects.includes(effect)
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                      : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {effect}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
            >
              Save session
            </button>
            <span className="text-xs text-white/60">All fields are optional; entries stay private.</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Session history</h2>
              <p className="text-xs text-white/60">Chronological, expandable entries.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReflect}
                className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Reflect on patterns
              </button>
              {aiStatus && <span className="text-xs text-white/60">{aiStatus}</span>}
            </div>
          </div>

          {aiReply && (
            <div className="bg-white/5 border border-emerald-400/30 rounded-md p-3 text-sm text-white/85">
              {aiReply}
            </div>
          )}

          {chronological.length === 0 ? (
            <p className="text-sm text-white/60">Add sessions to see them here.</p>
          ) : (
            <div className="space-y-2">
              {chronological.map((entry) => {
                const open = expanded[entry.id] ?? false;
                return (
                  <div key={entry.id} className="border border-white/10 rounded-md p-3 bg-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-white/90">
                        {new Date(entry.created_at).toLocaleString()}
                        {entry.product ? ` · ${entry.product}` : ''}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !open }))}
                        className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                      >
                        {open ? 'Hide' : 'View'}
                      </button>
                    </div>
                    <div className="text-xs text-white/70">
                      {entry.strain ? `Strain: ${entry.strain}` : 'Strain: —'}
                    </div>
                    {!open && (
                      <div className="text-sm text-white/80">
                        {excerpt(entry.felt) || 'No notes provided.'}
                      </div>
                    )}
                    {open && (
                      <div className="text-sm text-white/85 space-y-1">
                        <div>Notes: {entry.felt || '—'}</div>
                        <div>Effects: {entry.effects?.length ? entry.effects.join(', ') : '—'}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-white/60">
            This information is educational and observational, not medical advice.
          </p>
        </div>

        <div className="text-xs text-white/50">
          {/* TODO: Preference profiles; find similar experiences; optional sharing; anonymized industry insights */}
        </div>
      </div>
    </main>
  );
}

