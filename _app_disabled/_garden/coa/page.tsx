'use client';

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';

type Terpene = { name: string; percent: string };
type CoaEntry = {
  id: string;
  thc?: string;
  cbd?: string;
  terpenes: Terpene[];
  lab?: string;
  batch?: string;
  explanation: string;
  created_at: string;
};

export default function CoaExplainerPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thc, setThc] = useState('');
  const [cbd, setCbd] = useState('');
  const [terpenes, setTerpenes] = useState<Terpene[]>([{ name: '', percent: '' }]);
  const [lab, setLab] = useState('');
  const [batch, setBatch] = useState('');
  const [explanation, setExplanation] = useState<string>('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<CoaEntry[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('coa_history');
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Deterministic explanation
  const generatedExplanation = useMemo(() => {
    const points: string[] = [];
    const thcNum = parseFloat(thc) || null;
    const cbdNum = parseFloat(cbd) || null;
    if (thcNum !== null) {
      if (thcNum >= 20) points.push(`THC is reported at around ${thc}% which is common in higher potency flower.`);
      else if (thcNum >= 10) points.push(`THC is reported at around ${thc}% which is a moderate range for many products.`);
      else points.push(`THC is reported at around ${thc}%, a lower range that some consumers choose for a gentler experience.`);
    } else {
      points.push('THC was not provided; potency cannot be interpreted without that data.');
    }
    if (cbdNum !== null) {
      if (cbdNum >= 10) points.push(`CBD is around ${cbd}% which is common in CBD-forward products.`);
      else if (cbdNum > 0) points.push(`CBD is around ${cbd}% which may balance THC effects in some products.`);
      else points.push('CBD is not reported; focus appears to be on THC content.');
    } else {
      points.push('CBD was not provided; the balance between THC and CBD is unclear.');
    }
    if (terpenes.some((t) => t.name.trim())) {
      points.push('Terpenes listed help describe aroma and potential character; values are shown as reported.');
    }
    points.push('Lab and batch fields help trace provenance; fill them if available.');
    return points.join(' ');
  }, [thc, cbd, terpenes]);

  const handleAddTerpene = () => setTerpenes((prev) => [...prev, { name: '', percent: '' }]);
  const handleChangeTerpene = (idx: number, key: keyof Terpene, value: string) => {
    setTerpenes((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  };

  const handleSaveLocal = (explanationText: string) => {
    const entry: CoaEntry = {
      id: crypto.randomUUID(),
      thc,
      cbd,
      terpenes,
      lab,
      batch,
      explanation: explanationText,
      created_at: new Date().toISOString(),
    };
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    try {
      localStorage.setItem('coa_history', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleExplain = async () => {
    setAiStatus('Generating…');
    setAiReply(null);
    try {
      const res = await fetch('/api/garden/coa/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thc, cbd, terpenes, lab, batch }),
      });
      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error(data.error || 'failed');
      setAiReply(data.reply);
      setAiStatus(null);
      handleSaveLocal(data.reply);
    } catch {
      setAiStatus('Explanation will be available shortly.');
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await fetch('/api/garden/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `[COA] ${generatedExplanation}` }),
      });
    } catch {
      // ignore errors; optional
    } finally {
      setSavingNote(false);
    }
  };

  const explanationText = aiReply || generatedExplanation;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">COA Explainer</h1>
            <p className="text-sm text-white/70">Understand lab results in plain language.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h2 className="text-lg font-semibold text-white">Upload PDF (optional)</h2>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="text-sm text-white/80"
              />
              {pdfFile && <p className="text-xs text-white/60">Stored locally: {pdfFile.name}</p>}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h2 className="text-lg font-semibold text-white">Manual entry</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-white/70 space-y-1">
                  <span>THC % (optional)</span>
                  <input
                    value={thc}
                    onChange={(e) => setThc(e.target.value)}
                    className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                    placeholder="e.g., 18.5"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-xs text-white/70 space-y-1">
                  <span>CBD % (optional)</span>
                  <input
                    value={cbd}
                    onChange={(e) => setCbd(e.target.value)}
                    className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                    placeholder="e.g., 0.8"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-xs text-white/70 space-y-1">
                  <span>Lab name (optional)</span>
                  <input
                    value={lab}
                    onChange={(e) => setLab(e.target.value)}
                    className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                    placeholder="e.g., ABC Labs"
                  />
                </label>
                <label className="text-xs text-white/70 space-y-1">
                  <span>Batch / Lot (optional)</span>
                  <input
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                    placeholder="e.g., Lot 123"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/70">Terpenes (name + %). Partial entries allowed.</p>
                  <button
                    type="button"
                    onClick={handleAddTerpene}
                    className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                  >
                    Add terpene
                  </button>
                </div>
                <div className="space-y-2">
                  {terpenes.map((t, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        value={t.name}
                        onChange={(e) => handleChangeTerpene(idx, 'name', e.target.value)}
                        className="rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        placeholder="Name (e.g., Limonene)"
                      />
                      <input
                        value={t.percent}
                        onChange={(e) => handleChangeTerpene(idx, 'percent', e.target.value)}
                        className="rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
                        placeholder="% (e.g., 0.6)"
                        inputMode="decimal"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h2 className="text-lg font-semibold text-white">COA explanation</h2>
              <p className="text-sm text-white/80 whitespace-pre-wrap">
                {explanationText}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveLocal(explanationText)}
                  className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
                >
                  Save to COA history
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                  disabled={savingNote}
                >
                  Save to Personal Notes
                </button>
                <button
                  type="button"
                  onClick={handleExplain}
                  className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                >
                  Explain in plain English
                </button>
                {aiStatus && <span className="text-xs text-white/60">{aiStatus}</span>}
              </div>

              <p className="text-xs text-white/60">
                This information is educational and not medical advice.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">COA History (local)</h3>
              {history.length === 0 ? (
                <p className="text-xs text-white/60">Saved COA explanations will appear here.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((h) => (
                    <div key={h.id} className="border border-white/10 rounded-md p-2 text-sm text-white/85 space-y-1 bg-white/5">
                      <div className="text-[11px] text-white/60">{new Date(h.created_at).toLocaleString()}</div>
                      <div className="text-xs text-white/70">
                        THC: {h.thc || '—'} · CBD: {h.cbd || '—'} · Lab: {h.lab || '—'}
                      </div>
                      <div className="text-xs text-white/70">
                        Terpenes: {h.terpenes.filter((t) => t.name).map((t) => `${t.name} ${t.percent || ''}%`).join(', ') || '—'}
                      </div>
                      <div className="text-sm text-white/90 whitespace-pre-wrap">{h.explanation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-white/60">
          {/* TODO: OCR extraction; COA comparison over time; lab verification badges; dispensary product linking */}
        </div>
      </div>
    </main>
  );
}

