"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FeedbackMsg = { id: string; role: "user" | "admin"; message: string; created_at: string };

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FeedbackMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  const pollMs = 8000;
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => {
    const trimmed = text.trim();
    return !loading && trimmed.length > 0 && trimmed.length <= 2000;
  }, [text, loading]);

  async function loadThread() {
    setError(null);
    const res = await fetch("/api/feedback/thread", { cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setError("Could not load feedback.");
      return;
    }
    setThreadId(json.threadId ?? null);
    setMessages(Array.isArray(json.messages) ? json.messages : []);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadThread();
      if (!cancelled) setLoading(false);
    })();

    const id = window.setInterval(() => {
      loadThread();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // scroll to bottom on message updates
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Message is required.");
      return;
    }
    if (trimmed.length > 2000) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/feedback/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setLoading(false);
      setError("Could not send your feedback. Try again.");
      return;
    }

    setText("");
    // refresh thread immediately
    await loadThread();
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-green-500/80 text-white shadow-lg hover:bg-green-500/90 backdrop-blur-md transition-colors"
        aria-label="Open feedback"
        title="Feedback"
      >
        💬
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full sm:w-[520px] max-w-[95vw] rounded-t-2xl sm:rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">Feedback</div>
                <div className="text-xs text-white/60">
                  Send a message. Replies show up here.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

            <div
              ref={listRef}
              className="mt-4 h-[280px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
            >
              {messages.length === 0 && (
                <p className="text-sm text-white/60">No messages yet.</p>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "admin"
                      ? "ml-6 rounded-xl bg-white/10 border border-white/10 p-3"
                      : "mr-6 rounded-xl bg-green-500/10 border border-green-400/20 p-3"
                  }
                >
                  <div className="text-xs text-white/60">
                    {m.role === "admin" ? "Admin" : "You"}
                  </div>
                  <div className="text-sm text-white whitespace-pre-wrap break-words">
                    {m.message}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                placeholder="Type your feedback…"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-white/40 focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/50">{text.length}/2000</div>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={send}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Sending…" : "Send"}
                </button>
              </div>
              <div className="text-xs text-white/40">
                Thread: {threadId ? threadId : "creating…"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
