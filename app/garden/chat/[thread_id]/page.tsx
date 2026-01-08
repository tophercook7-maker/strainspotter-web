'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Message = { id: string; role: 'assistant' | 'user' | 'system'; content: string; created_at: string };
type Thread = { id: string; name: string | null; type: 'group' | 'direct' };

export default function ThreadPage() {
  const params = useParams();
  const threadId = params?.thread_id as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [askStatus, setAskStatus] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    const load = async () => {
      const { data: t } = await supabase.from('chat_threads').select('id,name,type').eq('id', threadId).maybeSingle();
      if (t) setThread({ id: t.id, name: t.name, type: t.type });
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, sender_type, content, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      setMessages(
        (msgs || []).map((m: any) => ({
          id: m.id,
          role: m.sender_type,
          content: m.content,
          created_at: m.created_at,
        }))
      );
    };
    load();
  }, [threadId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    const optimistic: Message = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_type: 'user',
      content: text,
    });
  };

  const handleAsk = async () => {
    if (asking) return;
    setAsking(true);
    setAskStatus(null);
    try {
      const res = await fetch('/api/garden/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input || 'Summarize recent discussion', thread_id: threadId }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setAskStatus('The Garden will respond when available.');
      }
    } catch {
      setAskStatus('The Garden will respond when available.');
    } finally {
      setAsking(false);
    }
  };

  const title = useMemo(() => {
    if (!thread) return 'Conversation';
    if (thread.type === 'group') return thread.name || 'Group';
    return thread.name || 'Direct Message';
  }, [thread]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="text-xs text-white/60">{thread?.type === 'group' ? 'Group discussion' : 'Direct message'}</p>
          </div>
          <Link href="/garden/chat" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Chat
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{m.role === 'assistant' ? 'Garden' : m.role === 'system' ? 'System' : 'You'}</span>
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
              placeholder="Send a calm, text-only note…"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              rows={2}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
              >
                Send
              </button>
              <button
                onClick={handleAsk}
                disabled={asking}
                className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Ask the Garden
              </button>
              <span className="text-xs text-white/50">AI replies only when asked; one response per click.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

