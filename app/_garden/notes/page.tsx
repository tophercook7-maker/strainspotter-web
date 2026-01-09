'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { allowAI, enforceCalmTone } from '@/lib/ai/guard';

type Note = {
  id: string;
  content: string;
  created_at: string;
};

export default function PersonalNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/garden/notes');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load notes');
        setNotes(data.notes || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hasNotes = notes.length > 0;

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notes]);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/garden/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save note');
      setNotes((prev) => [{ id: data.note.id, content: data.note.content, created_at: data.note.created_at }, ...prev]);
      setDraft('');
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleAsk = async () => {
    setAiStatus(null);
    setAiReply(null);
    if (!allowAI({ kind: 'chat', userAsked: true })) {
      setAiStatus('The Garden will respond when available.');
      return;
    }
    try {
      const res = await fetch('/api/garden/notes/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.map((n) => n.content) }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error || 'failed');
      setAiReply(enforceCalmTone(data.reply));
    } catch (err) {
      setAiStatus('The Garden will respond when available.');
    }
  };

  const renderEmpty = () => (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-white/80 space-y-3">
      <p>Personal Notes help you track ideas and observations that aren’t tied to a single grow.</p>
      <button
        onClick={() => setDraft('')}
        className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
      >
        Add your first note
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Personal Notes</h1>
            <p className="text-sm text-white/70">
              A private space to capture thoughts, patterns, and questions over time.
            </p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a thought, question, or observation…"
            rows={4}
            className="w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 text-white text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save note'}
            </button>
            <button
              type="button"
              onClick={handleAsk}
              className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
            >
              Ask the Garden
            </button>
            {aiStatus && <span className="text-xs text-white/60">{aiStatus}</span>}
          </div>
          {aiReply && (
            <div className="text-sm text-white/80 bg-white/5 border border-white/10 rounded-md p-3">
              {aiReply}
            </div>
          )}
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}

        {loading ? (
          <div className="text-sm text-white/70">Loading notes...</div>
        ) : hasNotes ? (
          <div className="space-y-3">
            {sortedNotes.map((note) => (
              <div key={note.id} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                <div className="text-[11px] text-white/60">{new Date(note.created_at).toLocaleString()}</div>
                <div className="text-sm text-white/90 whitespace-pre-wrap">{note.content}</div>
              </div>
            ))}
          </div>
        ) : (
          renderEmpty()
        )}

        {/* TODO: In a future version, Personal Notes will feed Visual Similarity context and Grow Doctor interpretation. */}
      </div>
    </main>
  );
}

