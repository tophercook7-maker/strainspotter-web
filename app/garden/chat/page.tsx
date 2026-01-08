'use client';

import { useState } from 'react';
import Link from 'next/link';

type Message = { id: string; role: 'assistant' | 'user'; content: string; created_at: string };
type Group = { id: string; title: string; intro: string };

const GROUPS: Group[] = [
  { id: 'new-growers', title: 'New Growers', intro: 'Starter guidance for those beginning their cultivation journey.' },
  { id: 'plant-health', title: 'Plant Health & Care', intro: 'Observational notes on plant health, environment, and care routines.' },
  { id: 'strains-genetics', title: 'Strains & Genetics', intro: 'Context about cultivar traits, lineage, and expectations.' },
  { id: 'labs-testing', title: 'Labs & Testing', intro: 'Educational notes on lab reports, methods, and interpretation.' },
  { id: 'dispensaries-products', title: 'Dispensaries & Products', intro: 'Product information sharing without sales or recommendations.' },
];

export default function GardenChatPage() {
  const [selected, setSelected] = useState<Group>(GROUPS[0]);
  const [messagesByGroup, setMessagesByGroup] = useState<Record<string, Message[]>>(() =>
    Object.fromEntries(
      GROUPS.map((g) => [
        g.id,
        [
          {
            id: `${g.id}-intro`,
            role: 'assistant',
            created_at: new Date().toISOString(),
            content: `${g.title}: ${g.intro} The Garden speaks first to keep conversation calm and contextual.`,
          },
        ],
      ])
    )
  );
  const [input, setInput] = useState('');
  const [askStatus, setAskStatus] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const messages = messagesByGroup[selected.id] || [];

  const handleAsk = async () => {
    if (!input.trim() || asking) return;
    const text = input.trim();
    setInput('');
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessagesByGroup((prev) => ({
      ...prev,
      [selected.id]: [...messages, userMsg],
    }));
    setAsking(true);
    setAskStatus(null);
    try {
      const res = await fetch('/api/garden/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, group_id: selected.id }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: data.reply, created_at: new Date().toISOString() };
        setMessagesByGroup((prev) => ({
          ...prev,
          [selected.id]: [...prev[selected.id], aiMsg],
        }));
      } else {
        setAskStatus('The Garden will respond when available.');
      }
    } catch {
      setAskStatus('The Garden will respond when available.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Garden Chat</h1>
            <p className="text-sm text-slate-300/80">Topic-based, calm discussion with AI summaries first.</p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
            <h2 className="text-sm uppercase tracking-[0.08em] text-white/70">Groups</h2>
            <div className="space-y-2">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelected(g)}
                  className={`w-full text-left px-3 py-2 rounded-md border text-sm transition ${
                    selected.id === g.id ? 'bg-emerald-500/20 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold">{g.title}</div>
                  <div className="text-[11px] text-white/60">{g.intro}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
                <p className="text-xs text-white/60">AI speaks first. Post only via "Ask the Group".</p>
              </div>
              <p className="text-[11px] text-white/50 max-w-sm text-right">
                No links, no instructions, no sales. AI summarizes calmly and rate-limits responses.
              </p>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {messages.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{m.role === 'assistant' ? 'Garden' : 'You'}</span>
                    <span className="text-[11px] text-slate-500">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className={`text-sm leading-relaxed ${m.role === 'assistant' ? 'text-slate-200' : 'text-slate-100'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {askStatus && <div className="text-xs text-slate-400">{askStatus}</div>}
            </div>

            <div className="space-y-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the group a calm, topic-focused question…"
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAsk}
                  disabled={asking || !input.trim()}
                  className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
                >
                  {asking ? 'Thinking…' : 'Ask the Group'}
                </button>
                <span className="text-xs text-white/50">
                  AI replies first; multiple posts may be summarized into one calm response.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/50">
          {/* TODO: User-created groups; expert AMAs; opt-in DMs; local groups; pro-only industry rooms */}
        </div>
      </div>
    </main>
  );
}
