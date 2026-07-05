"use client";

// Community group chat room with moderator tools.
// Members chat; moderators (and the owner) get a 🛡️ toolbar per message:
// hide message, mute author 24h, remove author from the group.
// Polls every 4s like the B2B chat; the no-sales guard runs server-side.

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import TopNav from "../../_components/TopNav";

let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

interface Msg {
  id: string;
  senderId: string | null;
  senderName: string;
  isModerator: boolean;
  content: string;
  createdAt: string;
  mine: boolean;
}

const POLL_MS = 4000;

export default function CommunityChatPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const auth = useOptionalAuth();
  const token: string | undefined = auth?.session?.access_token;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [muted, setMuted] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [modOpenFor, setModOpenFor] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const authedFetch = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      }),
    [token]
  );

  const fetchMessages = useCallback(async () => {
    if (!token || !threadId) return;
    try {
      const after = cursorRef.current ? `&after=${encodeURIComponent(cursorRef.current)}` : "";
      const res = await authedFetch(`/api/community/messages?threadId=${threadId}${after}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load chat"); return; }
      setCanModerate(json.canModerate === true);
      setMuted(json.muted === true);
      const fresh: Msg[] = (json.messages ?? []).filter((m: Msg) => !seenRef.current.has(m.id));
      if (fresh.length) {
        for (const m of fresh) seenRef.current.add(m.id);
        cursorRef.current = fresh[fresh.length - 1].createdAt;
        setMessages((prev) => [...prev, ...fresh]);
        setError(null);
      }
    } catch { /* transient — next poll retries */ }
  }, [token, threadId, authedFetch]);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(t);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending || !token || !threadId) return;
    setSending(true);
    try {
      const res = await authedFetch("/api/community/messages", {
        method: "POST",
        body: JSON.stringify({ threadId, content }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to send"); return; }
      setDraft("");
      setError(null);
      await fetchMessages();
    } finally { setSending(false); }
  };

  const report = async (m: Msg) => {
    if (!threadId) return;
    const reason = window.prompt(`Report ${m.senderName}'s message to the moderators?\nOptional: tell us why.`, "");
    if (reason === null) return; // cancelled
    try {
      const res = await authedFetch("/api/community/report", {
        method: "POST",
        body: JSON.stringify({ threadId, messageId: m.id, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Report failed"); return; }
      setModOpenFor(null);
      setError(null);
      window.alert("Thanks — the moderators will take a look.");
    } catch { setError("Report failed"); }
  };

  const moderate = async (
    action: "hide" | "mute" | "remove",
    m: Msg
  ) => {
    if (!threadId) return;
    const labels = {
      hide: `Hide this message from the group?`,
      mute: `Mute ${m.senderName} for 24 hours? They can read but not post.`,
      remove: `Remove ${m.senderName} from this group?`,
    };
    if (!window.confirm(labels[action])) return;
    try {
      const res = await authedFetch("/api/community/moderate", {
        method: "POST",
        body: JSON.stringify({
          threadId,
          action,
          ...(action === "hide" ? { messageId: m.id } : { userId: m.senderId }),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Moderation failed"); return; }
      if (action === "hide") {
        setMessages((prev) => prev.filter((x) => x.id !== m.id));
      }
      setModOpenFor(null);
      setError(null);
    } catch { setError("Moderation failed"); }
  };

  const modBtn: React.CSSProperties = {
    padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
    background: "rgba(255,213,79,0.12)", color: "#FFD54F", border: "1px solid rgba(255,213,79,0.35)",
  };

  return (
    <>
      <TopNav title="Group Chat" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-4" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 60px)" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
            Educational only — no buying or selling 🌿
            {canModerate && <span style={{ color: "#FFD54F", fontWeight: 800 }}> · 🛡️ you're a moderator here</span>}
          </div>

          {error && (
            <div style={{ color: "#FFB74D", fontSize: 13, textAlign: "center", marginBottom: 10 }}>⚠️ {error}</div>
          )}

          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
            {messages.length === 0 && !error && (
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", padding: "48px 0" }}>
                Quiet in here — start the conversation.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div
                  onClick={() => !m.mine ? setModOpenFor(modOpenFor === m.id ? null : m.id) : undefined}
                  style={{
                    maxWidth: "78%", padding: "10px 14px", borderRadius: 16,
                    borderBottomRightRadius: m.mine ? 4 : 16,
                    borderBottomLeftRadius: m.mine ? 16 : 4,
                    background: m.mine ? "linear-gradient(135deg, #34d399, #059669)" : "rgba(255,255,255,0.10)",
                    border: m.mine ? "none" : "1px solid rgba(255,255,255,0.15)",
                    cursor: !m.mine ? "pointer" : "default",
                  }}
                >
                  {!m.mine && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ color: "#6ee7b7", fontSize: 12, fontWeight: 800 }}>{m.senderName}</span>
                      {m.isModerator && (
                        <span style={{ color: "#FFD54F", fontSize: 9, fontWeight: 900, border: "1px solid rgba(255,213,79,0.4)", borderRadius: 99, padding: "0 6px" }}>
                          🛡️ MOD
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ color: "white", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 4, textAlign: "right" }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>

                  {/* Action toolbar: mod tools for moderators, report for members */}
                  {modOpenFor === m.id && !m.mine && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                      {canModerate ? (
                        <>
                          <button style={modBtn} onClick={() => moderate("hide", m)}>Hide message</button>
                          {m.senderId && !m.isModerator && (
                            <>
                              <button style={modBtn} onClick={() => moderate("mute", m)}>Mute 24h</button>
                              <button style={modBtn} onClick={() => moderate("remove", m)}>Remove from group</button>
                            </>
                          )}
                        </>
                      ) : (
                        <button
                          style={{ ...modBtn, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)" }}
                          onClick={() => report(m)}
                        >
                          ⚑ Report to moderators
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {muted ? (
            <div style={{ textAlign: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.12)", color: "#FFB74D", fontSize: 13 }}>
              🔇 You're muted in this group for now — you can still read along.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={token ? "Message the group…" : "Sign in to chat"}
                rows={1}
                disabled={!token}
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 14, resize: "none",
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                  color: "white", fontSize: 14, outline: "none",
                }}
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim() || !token}
                style={{
                  padding: "0 20px", borderRadius: 14, border: "none", fontWeight: 800, fontSize: 14,
                  background: draft.trim() && token ? "linear-gradient(135deg, #34d399, #059669)" : "rgba(255,255,255,0.1)",
                  color: "white", cursor: draft.trim() && token ? "pointer" : "default",
                }}
              >
                ➤
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
