"use client";

// B2B connection chat — one thread between two mutually-accepted businesses.
// Polls /api/b2b/messages every 4s with an `after` cursor; sending refreshes
// immediately. Realtime can replace polling later without changing the API.

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import TopNav from "../../../_components/TopNav";

let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

interface Msg {
  id: string;
  senderId: string | null;
  senderType: string;
  content: string;
  createdAt: string;
  mine: boolean;
}

const POLL_MS = 4000;

export default function BusinessChatPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const auth = useOptionalAuth();
  const token: string | undefined = auth?.session?.access_token;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    if (!token || !threadId) return;
    try {
      const after = cursorRef.current ? `&after=${encodeURIComponent(cursorRef.current)}` : "";
      const res = await fetch(`/api/b2b/messages?threadId=${threadId}${after}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load chat"); return; }
      const fresh: Msg[] = (json.messages ?? []).filter((m: Msg) => !seenRef.current.has(m.id));
      if (fresh.length) {
        for (const m of fresh) seenRef.current.add(m.id);
        cursorRef.current = fresh[fresh.length - 1].createdAt;
        setMessages((prev) => [...prev, ...fresh]);
        setError(null);
      }
    } catch { /* transient network — next poll retries */ }
  }, [token, threadId]);

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
      const res = await fetch("/api/b2b/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threadId, content }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to send"); return; }
      setDraft("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TopNav title="Business Chat" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-4" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 60px)" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
            Connected by mutual consent · keep it business
          </div>

          {error && (
            <div style={{ color: "#FFB74D", fontSize: 13, textAlign: "center", marginBottom: 10 }}>⚠️ {error}</div>
          )}

          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
            {messages.length === 0 && !error && (
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", padding: "48px 0" }}>
                Say hello — introduce your business.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: 16,
                  borderBottomRightRadius: m.mine ? 4 : 16,
                  borderBottomLeftRadius: m.mine ? 16 : 4,
                  background: m.mine ? "linear-gradient(135deg, #34d399, #059669)" : "rgba(255,255,255,0.10)",
                  border: m.mine ? "none" : "1px solid rgba(255,255,255,0.15)",
                }}>
                  <div style={{ color: "white", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 4, textAlign: "right" }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={token ? "Message…" : "Sign in to chat"}
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
        </div>
      </main>
    </>
  );
}
