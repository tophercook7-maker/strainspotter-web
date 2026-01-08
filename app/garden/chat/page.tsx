'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useChatUser } from '@/components/garden/ChatUserProvider';

type Message = { id: string; role: 'assistant' | 'user' | 'system'; content: string; created_at: string };
type Group = { id: string; title: string; intro: string };
type Contact = { id: string; name: string; role: 'peer' | 'professional'; moderator?: boolean };

const GROUPS: Group[] = [
  { id: 'new-growers', title: 'New Growers', intro: 'Starter guidance for those beginning their cultivation journey.' },
  { id: 'plant-health', title: 'Plant Health & Care', intro: 'Observational notes on plant health, environment, and care routines.' },
  { id: 'strains-genetics', title: 'Strains & Genetics', intro: 'Context about cultivar traits, lineage, and expectations.' },
  { id: 'labs-testing', title: 'Labs & Testing', intro: 'Educational notes on lab reports, methods, and interpretation.' },
  { id: 'dispensaries-products', title: 'Dispensaries & Products', intro: 'Product information sharing without sales or recommendations.' },
];

const CONTACTS: Contact[] = [
  { id: 'ally-grower', name: 'Grower Ally', role: 'peer' },
  { id: 'lab-liaison', name: 'Lab Liaison', role: 'professional', moderator: true },
  { id: 'dispensary-contact', name: 'Dispensary Contact', role: 'professional' },
];

export default function GardenChatPage() {
  const chatUser = useChatUser();
  const [tab, setTab] = useState<'groups' | 'messages'>('groups');
  const [selectedGroup, setSelectedGroup] = useState<Group>(GROUPS[0]);
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

  const [selectedContact, setSelectedContact] = useState<Contact>(CONTACTS[0]);
  const [messagesByContact, setMessagesByContact] = useState<Record<string, Message[]>>(() =>
    Object.fromEntries(
      CONTACTS.map((c) => [
        c.id,
        [
          {
            id: `${c.id}-intro`,
            role: 'assistant',
            created_at: new Date().toISOString(),
            content: `${c.name} is available for calm, text-only conversation. AI can clarify when asked.`,
          },
        ],
      ])
    )
  );

  const [groupInput, setGroupInput] = useState('');
  const [groupQuestionOpen, setGroupQuestionOpen] = useState(false);
  const [discussionOpened, setDiscussionOpened] = useState(false);
  const [dmInput, setDmInput] = useState('');
  const [askStatus, setAskStatus] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [aiDailyRemaining, setAiDailyRemaining] = useState(3);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [hasSharedDiscussion, setHasSharedDiscussion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('garden_shared_discussion');
    if (stored === 'true') setHasSharedDiscussion(true);
  }, []);

  const groupMessages = messagesByGroup[selectedGroup.id] || [];
  const dmMessages = messagesByContact[selectedContact.id] || [];

  const groupAskDisabled = !groupInput.trim() || asking;
  const dmSendDisabled = !dmInput.trim();
  const dmAskDisabled = asking || aiDailyRemaining <= 0 || !dmMessages.length;

  const handleAskGroup = async () => {
    if (groupAskDisabled) return;
    const text = groupInput.trim();
    setGroupInput('');
    setGroupQuestionOpen(false);
    setDiscussionOpened(true);
    setHasSharedDiscussion(true);
    if (typeof window !== 'undefined') window.localStorage.setItem('garden_shared_discussion', 'true');
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessagesByGroup((prev) => ({
      ...prev,
      [selectedGroup.id]: [...groupMessages, userMsg],
    }));
    setAsking(true);
    setAskStatus(null);
    try {
      const attempt = async () => {
        const res = await fetch('/api/garden/chat/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, group_id: selectedGroup.id }),
        });
        const data = await res.json();
        return { ok: res.ok, reply: data.reply as string | undefined };
      };
      const first = await attempt();
      let reply = first.reply;
      if (!first.ok || !reply) {
        const second = await attempt();
        reply = second.reply;
      }
      if (reply) {
        const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: reply, created_at: new Date().toISOString() };
        setMessagesByGroup((prev) => ({
          ...prev,
          [selectedGroup.id]: [...prev[selectedGroup.id], aiMsg],
        }));
        // System moderator gentle summary after AI if thread is getting long
        const userCount = [...groupMessages, userMsg].filter((m) => m.role === 'user').length;
        if (userCount >= 2) {
          const systemMsg: Message = {
            id: `sys-${Date.now()}`,
            role: 'system',
            content: 'To keep the discussion focused, here’s a brief summary so far. Feel free to share concise follow-ups.',
            created_at: new Date().toISOString(),
          };
          setMessagesByGroup((prev) => ({
            ...prev,
            [selectedGroup.id]: [...prev[selectedGroup.id], systemMsg],
          }));
        }
      } else {
        const fallback: Message = {
          id: `ai-fallback-${Date.now()}`,
          role: 'assistant',
          content: 'Here is a calm, initial perspective while others join: your question is noted. The Garden suggests keeping observations concise and focused.',
          created_at: new Date().toISOString(),
        };
        setMessagesByGroup((prev) => ({
          ...prev,
          [selectedGroup.id]: [...prev[selectedGroup.id], fallback],
        }));
      }
    } catch {
      const fallback: Message = {
        id: `ai-fallback-${Date.now()}`,
        role: 'assistant',
        content: 'Here is a calm, initial perspective while others join: your question is noted. The Garden suggests keeping observations concise and focused.',
        created_at: new Date().toISOString(),
      };
      setMessagesByGroup((prev) => ({
        ...prev,
        [selectedGroup.id]: [...prev[selectedGroup.id], fallback],
      }));
    } finally {
      setAsking(false);
    }
  };

  const handleSendDm = () => {
    if (dmSendDisabled) return;
    const text = dmInput.trim();
    setDmInput('');
    const userMsg: Message = { id: `dm-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessagesByContact((prev) => ({
      ...prev,
      [selectedContact.id]: [...dmMessages, userMsg],
    }));
    setHasSharedDiscussion(true);
    if (typeof window !== 'undefined') window.localStorage.setItem('garden_shared_discussion', 'true');
  };

  const handleAskDm = async () => {
    if (dmAskDisabled) return;
    setAsking(true);
    setAskStatus(null);
    try {
      const res = await fetch('/api/garden/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: dmMessages[dmMessages.length - 1]?.content || '', contact_id: selectedContact.id }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: data.reply, created_at: new Date().toISOString() };
        setMessagesByContact((prev) => ({
          ...prev,
          [selectedContact.id]: [...prev[selectedContact.id], aiMsg],
        }));
        setAiDailyRemaining((n) => Math.max(0, n - 1));
      } else {
        setAskStatus('The Garden will respond when available.');
      }
    } catch {
      setAskStatus('The Garden will respond when available.');
    } finally {
      setAsking(false);
    }
  };

  const handleReport = () => {
    setReportNotice('Reported. Thank you for keeping the Garden calm.');
    setTimeout(() => setReportNotice(null), 2000);
  };

  const dmAllowed =
    hasSharedDiscussion ||
    selectedContact.role === 'professional';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-300">Garden Chat</h1>
            <p className="text-sm text-slate-300/80">Topic groups and calm 1:1 messages with AI only when asked.</p>
            <p className="text-xs text-white/60">This space supports learning from scans and grows.</p>
            {chatUser && (
              <p className="text-xs text-white/50">Signed in as {chatUser.displayName || chatUser.email}</p>
            )}
          </div>
          <Link href="/garden" className="text-emerald-300 text-sm hover:text-emerald-200 underline underline-offset-4">
            ← Back to Garden
          </Link>
        </div>

        <div className="flex gap-3 text-sm">
          <button
            onClick={() => setTab('groups')}
            className={`px-3 py-2 rounded-md border ${tab === 'groups' ? 'bg-emerald-500/20 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
          >
            Groups
          </button>
          <button
            onClick={() => setTab('messages')}
            className={`px-3 py-2 rounded-md border ${tab === 'messages' ? 'bg-emerald-500/20 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
          >
            Messages
          </button>
        </div>

        {tab === 'groups' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
              <h2 className="text-sm uppercase tracking-[0.08em] text-white/70">Groups</h2>
              <p className="text-[11px] text-white/50">These are guided discussions. Ask a question to begin.</p>
              <div className="space-y-2">
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm transition ${
                      selectedGroup.id === g.id ? 'bg-emerald-500/20 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
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
                  <h3 className="text-lg font-semibold text-white">{selectedGroup.title}</h3>
                  <p className="text-xs text-white/60">AI speaks first. Post only via "Ask the Group".</p>
                </div>
                <p className="text-[11px] text-white/50 max-w-sm text-right">
                  No links, no instructions, no sales. AI summarizes calmly and rate-limits responses.
                </p>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {groupMessages.length === 0 && (
                  <div className="text-sm text-white/60">Start with a question. The Garden will respond.</div>
                )}
                {groupMessages.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {m.role === 'assistant' ? 'Garden' : m.role === 'system' ? 'System' : 'You'}
                      </span>
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

              <div className="space-y-2">
                {!groupQuestionOpen ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => setGroupQuestionOpen(true)}
                      className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
                    >
                      Ask a Question
                    </button>
                    <p className="text-xs text-white/60">The Garden will respond first. Others may join in.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/60">Ask a clear question. The Garden will respond first.</p>
                    <textarea
                      value={groupInput}
                      onChange={(e) => setGroupInput(e.target.value)}
                      placeholder="Ask the group a calm, topic-focused question…"
                      className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAskGroup}
                        disabled={groupAskDisabled}
                        className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {asking ? 'Thinking…' : 'Send question'}
                      </button>
                      <button
                        onClick={() => {
                          setGroupQuestionOpen(false);
                          setGroupInput('');
                        }}
                        className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                      >
                        Cancel
                      </button>
                      <span className="text-xs text-white/50">
                        AI replies only when asked; long threads are summarized into one response.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.08em] text-white/70">Messages</h2>
                  <p className="text-[11px] text-white/50">Direct conversations begin after shared discussion.</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                  disabled
                  title="Direct messages are available after shared discussion."
                >
                  Message Someone You’ve Met
                </button>
              </div>
              <div className="space-y-2">
                {CONTACTS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm transition ${
                      selectedContact.id === c.id ? 'bg-emerald-500/20 border-emerald-500/40 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[11px] text-white/60">
                      {c.role === 'professional' ? 'Professional moderator' : 'Peer'}
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleReport}
                className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Report
              </button>
              {reportNotice && <p className="text-[11px] text-white/60">{reportNotice}</p>}
            </div>

            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedContact.name}</h3>
                  <p className="text-xs text-white/60">Text-only. No links, no media. AI helps only when asked.</p>
                </div>
                <p className="text-[11px] text-white/50 max-w-sm text-right">
                  No read receipts. No typing indicators. Conversations stay calm.
                </p>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {dmMessages.length === 0 && <div className="text-sm text-white/60">This space starts with a question.</div>}
                {dmMessages.map((m) => (
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
              </div>

              {dmAllowed ? (
                <div className="space-y-2">
                  <textarea
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    placeholder="Send a calm, text-only note…"
                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    rows={2}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSendDm}
                      disabled={dmSendDisabled}
                      className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Send
                    </button>
                    <button
                      onClick={handleAskDm}
                      disabled={dmAskDisabled}
                      className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                    >
                      {aiDailyRemaining <= 0 ? 'AI limit reached' : 'Ask the Garden'}
                    </button>
                    {selectedContact.moderator && (
                      <button
                        onClick={handleAskDm}
                        disabled={dmAskDisabled}
                        className="text-sm text-white/60 hover:text-white underline underline-offset-4"
                      >
                        Request AI summary
                      </button>
                    )}
                    <span className="text-xs text-white/50">AI summaries capped per day; never responds unprompted.</span>
                    {askStatus && <span className="text-xs text-white/60">{askStatus}</span>}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/60">
                  Direct messages are available after shared discussion.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-white/50">
          {/* TODO: Verified industry accounts; expert office hours; local groups; pro-only messaging; media/file sharing */}
        </div>
      </div>
    </main>
  );
}
