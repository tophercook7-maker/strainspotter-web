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
  const [questionOpen, setQuestionOpen] = useState(false);
  const [hasSharedDiscussion, setHasSharedDiscussion] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [headerNote] = useState('This space supports learning from scans and grows.');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('garden_shared_discussion');
      if (stored === 'true') setHasSharedDiscussion(true);
    }
  }, []);

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

  useEffect(() => {
    if (thread?.type === 'group') {
      setHasSharedDiscussion(true);
    }
  }, [thread]);

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
    if (thread?.type === 'group') {
      const systemMsg: Message = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'To keep the discussion focused, here’s a brief summary so far. Feel free to share concise follow-ups.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMsg]);
    }
    if (thread?.type === 'direct') {
      setHasSharedDiscussion(true);
      if (typeof window !== 'undefined') window.localStorage.setItem('garden_shared_discussion', 'true');
    }
  };

  const handleGroupQuestion = async () => {
    if (!pendingQuestion.trim() || asking) return;
    const text = pendingQuestion.trim();
    setPendingQuestion('');
    setQuestionOpen(false);
    setHasSharedDiscussion(true);
    if (typeof window !== 'undefined') window.localStorage.setItem('garden_shared_discussion', 'true');

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setAsking(true);
    setAskStatus(null);

    try {
      await supabase.from('chat_messages').insert({
        thread_id: threadId,
        sender_type: 'user',
        content: text,
      });
    } catch {
      // ignore, non-blocking for demo
    }

    const attemptAsk = async () => {
      const res = await fetch('/api/garden/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, thread_id: threadId }),
      });
      const data = await res.json();
      return { ok: res.ok, reply: data.reply as string | undefined };
    };

    try {
      const first = await attemptAsk();
      let reply = first.reply;
      if (!first.ok || !reply) {
        const second = await attemptAsk();
        reply = second.reply;
      }
      if (reply) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          created_at: new Date().toISOString(),
        };
        const systemMsg: Message = {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: 'The Garden summarized the discussion. Continue with brief, topic-focused notes.',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg, systemMsg]);
      } else {
        const fallback: Message = {
          id: `ai-fallback-${Date.now()}`,
          role: 'assistant',
          content: 'Here is a calm, initial perspective while others join: your question is noted. The Garden suggests keeping observations concise and focused.',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallback]);
      }
    } catch {
      const fallback: Message = {
        id: `ai-fallback-${Date.now()}`,
        role: 'assistant',
        content: 'Here is a calm, initial perspective while others join: your question is noted. The Garden suggests keeping observations concise and focused.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setAsking(false);
    }
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
        if (thread?.type === 'group') {
          const systemMsg: Message = {
            id: `sys-${Date.now()}`,
            role: 'system',
            content: 'The Garden summarized the discussion. Continue with brief, topic-focused notes.',
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, systemMsg]);
        }
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

  const dmAllowed = thread?.type === 'direct' ? hasSharedDiscussion : true;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="text-xs text-white/60">{thread?.type === 'group' ? 'Group discussion' : 'Direct message'}</p>
            <p className="text-xs text-white/50">{headerNote}</p>
          </div>
          <Link href="/garden/chat" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Chat
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {messages.length === 0 && <div className="text-sm text-white/60">Start with a question. The Garden will respond.</div>}
            {messages.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{m.role === 'assistant' ? 'Garden' : m.role === 'system' ? 'System' : 'You'}</span>
                  <span className="text-[11px] text-slate-500">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <div
                  className={`text-sm leading-relaxed ${
                    m.role === 'assistant'
                      ? 'text-slate-200'
                      : m.role === 'system'
                      ? 'text-white/60 italic'
                      : 'text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {askStatus && <div className="text-xs text-slate-400">{askStatus}</div>}
          </div>

          {thread?.type === 'group' ? (
            <div className="space-y-2">
              {!questionOpen ? (
                <button
                  onClick={() => setQuestionOpen(true)}
                  className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
                >
                  Ask the Group
                </button>
              ) : (
                <>
                  <p className="text-xs text-white/60">Ask a clear question. The Garden will respond first.</p>
                  <textarea
                    value={pendingQuestion}
                    onChange={(e) => setPendingQuestion(e.target.value)}
                    placeholder="Ask a concise, text-only question…"
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    rows={2}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleGroupQuestion}
                      disabled={!pendingQuestion.trim() || asking}
                      className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {asking ? 'Thinking…' : 'Send question'}
                    </button>
                    <button
                      onClick={() => {
                        setQuestionOpen(false);
                        setPendingQuestion('');
                      }}
                      className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                    >
                      Cancel
                    </button>
                    <span className="text-xs text-white/50">The Garden answers once; then the group can discuss calmly.</span>
                  </div>
                </>
              )}
            </div>
          ) : dmAllowed ? (
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
          ) : (
            <div className="text-sm text-white/60">
              Direct messages are available after shared discussion.
            </div>
          )}
          {thread?.type === 'group' && (
            <div className="text-[11px] text-white/50">
              Questions here can improve future scan insights.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

