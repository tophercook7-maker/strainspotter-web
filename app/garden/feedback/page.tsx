"use client";

// Two-way feedback — /garden/feedback
// Users send ideas, suggestions, and bug reports; the owner replies from the
// admin console and the reply shows up right here. "This app is built with
// its users" is the whole point — ask for input, and answer it.

import { useState, useEffect, useCallback } from "react";
import TopNav from "../_components/TopNav";

let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: 16,
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
};

const CATEGORIES = [
  { key: "idea", label: "💡 Idea" },
  { key: "suggestion", label: "🛠️ Suggestion" },
  { key: "bug", label: "🐛 Bug" },
  { key: "praise", label: "💚 Praise" },
  { key: "other", label: "💬 Other" },
] as const;

interface FeedbackItem {
  id: string;
  category: string;
  content: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
}

export default function FeedbackPage() {
  const auth = useOptionalAuth();
  const token: string | undefined = auth?.session?.access_token;

  const [category, setCategory] = useState<string>("idea");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/feedback", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setItems(json.feedback ?? []);
    } catch { /* noop */ }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const msg = message.trim();
    if (!msg || busy || !token) return;
    setBusy(true); setNotice(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, message: msg }),
      });
      const json = await res.json();
      if (!res.ok) { setNotice(json.error || "Failed to send."); return; }
      setMessage("");
      setNotice("Sent — thank you! You'll see a reply here when we've read it.");
      await load();
    } finally { setBusy(false); }
  };

  return (
    <>
      <TopNav title="Feedback" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>💡</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Your ideas shape this app</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              What should we build next? What&apos;s broken? What do you love? Tell us —
              a real person reads every message and replies right here.
            </div>
          </div>

          {/* Compose */}
          <div style={{ ...glass, padding: 18, marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setCategory(c.key)} style={{
                  padding: "6px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  background: category === c.key ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.06)",
                  color: category === c.key ? "#6ee7b7" : "rgba(255,255,255,0.65)",
                  border: `1px solid ${category === c.key ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}>
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder={token ? "Tell us what you're thinking…" : "Sign in to send feedback"}
              disabled={!token}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 14, outline: "none", resize: "vertical", marginBottom: 10 }}
            />
            <button
              onClick={submit}
              disabled={busy || !message.trim() || !token}
              style={{
                width: "100%", padding: "13px 18px", borderRadius: 12, border: "none",
                background: message.trim() && token ? "linear-gradient(135deg, #34d399, #059669)" : "rgba(255,255,255,0.1)",
                color: "white", fontWeight: 800, fontSize: 15, cursor: message.trim() && token ? "pointer" : "default",
              }}
            >
              {busy ? "Sending…" : "Send feedback"}
            </button>
            {notice && (
              <div style={{ color: "#FFD54F", fontSize: 13, marginTop: 10, textAlign: "center" }}>{notice}</div>
            )}
          </div>

          {/* My feedback + replies */}
          {items.length > 0 && (
            <>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Your feedback
              </div>
              {items.map((f) => (
                <div key={f.id} style={{ ...glass, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "#FFD54F", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{f.category}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{new Date(f.created_at).toLocaleDateString()}</span>
                    {f.status === "new" && (
                      <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.5)", fontSize: 11 }}>waiting for review</span>
                    )}
                  </div>
                  <div style={{ color: "white", fontSize: 14, lineHeight: 1.6 }}>{f.content}</div>
                  {f.admin_reply && (
                    <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
                      <div style={{ color: "#6ee7b7", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>🌿 STRAINSPOTTER REPLIED</div>
                      <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5, lineHeight: 1.6 }}>{f.admin_reply}</div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
