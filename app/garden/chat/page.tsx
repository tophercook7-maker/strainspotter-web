'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  role: 'user' | 'assistant';
};

export default function GardenChatPage() {
  const params = useSearchParams();
  const growId = params.get('grow_id');
  const growName = params.get('grow_name');
  const scanId = params.get('scan_id');
  const diagnosisId = params.get('diagnosis_id');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [askStatus, setAskStatus] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const contextLabel = useMemo(() => {
    if (growName) return `Discussing: ${growName}`;
    if (scanId) return 'Discussing: Scan';
    if (diagnosisId) return 'Discussing: Diagnosis';
    return 'Garden Chat';
  }, [growName, scanId, diagnosisId]);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (growId) qs.append('grow_id', growId);
        if (scanId) qs.append('scan_id', scanId);
        if (diagnosisId) qs.append('diagnosis_id', diagnosisId);
        const res = await fetch(`/api/garden/chat?${qs.toString()}`);
        const data = await res.json();
        if (res.ok) {
          const mapped: ChatMessage[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            content: m.content,
            created_at: m.created_at,
            role: 'user',
          }));
          setMessages(mapped);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [growId, scanId, diagnosisId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      content: text,
      created_at: new Date().toISOString(),
      role: 'user',
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const res = await fetch('/api/garden/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          grow_id: growId,
          scan_id: scanId,
          diagnosis_id: diagnosisId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, id: data.message.id, created_at: data.message.created_at } : m)));
      }
    } finally {
      setSending(false);
    }
  };

  const handleAskAI = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setAsking(true);
    setAskStatus(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/garden/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastUser.content,
          grow_id: growId,
          scan_id: scanId,
          diagnosis_id: diagnosisId,
          message_id: lastUser.id,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            content: data.reply,
            created_at: new Date().toISOString(),
            role: 'assistant',
          },
        ]);
      } else {
        setAskStatus('The Garden will respond when available.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setAskStatus('Still thinking. Insight will appear shortly.');
      } else {
        setAskStatus('The Garden will respond when available.');
      }
    } finally {
      clearTimeout(timeout);
      setAsking(false);
    }
  };

  const emptyState = !loading && messages.length === 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Garden Chat</h1>
            <p className="text-sm text-slate-300/80">{contextLabel}</p>
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto space-y-3 pr-1"
          >
            {loading && <p className="text-sm text-slate-400">Loading chat...</p>}
            {emptyState && (
              <p className="text-sm text-slate-400">
                Use Garden Chat to reflect on your grow or ask about recent activity.
              </p>
            )}
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
            {askStatus && (
              <div className="text-xs text-slate-400">{askStatus}</div>
            )}
          </div>

          <div className="space-y-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a thought or ask a question…"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
              >
                Send
              </button>
              <button
                onClick={handleAskAI}
                disabled={asking || !messages.some((m) => m.role === 'user')}
                className="px-4 py-2 rounded-md bg-white/10 text-slate-100 text-sm font-semibold border border-white/15 hover:bg-white/15 disabled:opacity-60"
              >
                Ask the Garden
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

