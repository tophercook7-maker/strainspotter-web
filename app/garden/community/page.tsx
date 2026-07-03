"use client";

// Community — the five group chats (New Growers, Plant Health & Care,
// Strains & Genetics, Labs & Testing, Dispensaries & Products).
// This replaces the v1 "Coming v2.0" placeholder. Educational talk only —
// the no-sales guard + volunteer moderators keep the atmosphere clean and
// healthy.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const GROUP_ICONS: Record<string, string> = {
  "New Growers": "🌱",
  "Plant Health & Care": "🩺",
  "Strains & Genetics": "🧬",
  "Labs & Testing": "🧪",
  "Dispensaries & Products": "🏪",
};

interface Group {
  threadId: string;
  name: string;
  memberCount: number;
  moderatorCount: number;
  joined: boolean;
  myRole: string | null;
}

export default function CommunityPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const token: string | undefined = auth?.session?.access_token;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) { setLoaded(true); return; }
    try {
      const res = await fetch("/api/community/groups", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setGroups(json.groups ?? []);
      else setNotice(json.error || null);
    } catch { /* noop */ }
    setLoaded(true);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const join = async (g: Group) => {
    if (!token) return;
    setBusy(g.threadId);
    try {
      const res = await fetch("/api/community/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threadId: g.threadId, action: "join" }),
      });
      if (res.ok) router.push(`/garden/community/${g.threadId}`);
      else setNotice(((await res.json()) as { error?: string }).error ?? "Couldn't join.");
    } finally { setBusy(null); }
  };

  return (
    <>
      <TopNav title="Community" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>💬</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Community</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Talk growing, plant health, genetics, and products with other members.
              Educational only — no buying or selling. Volunteer moderators keep
              things clean and healthy. 🌿
            </div>
          </div>

          {notice && (
            <div style={{ ...glass, padding: 12, marginBottom: 14 }}>
              <span style={{ color: "#FFD54F", fontSize: 13 }}>{notice}</span>
            </div>
          )}

          {!token && loaded && (
            <div style={{ ...glass, padding: 22, textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
              Sign in with an active membership to join the groups.
            </div>
          )}

          {groups.map((g) => (
            <div key={g.threadId} style={{ ...glass, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{GROUP_ICONS[g.name] ?? "💬"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 15 }}>{g.name}</span>
                    {g.myRole === "moderator" && (
                      <span style={{ color: "#FFD54F", fontSize: 10, fontWeight: 900, border: "1px solid rgba(255,213,79,0.4)", borderRadius: 99, padding: "1px 8px" }}>
                        🛡️ MOD
                      </span>
                    )}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · {g.moderatorCount} mod{g.moderatorCount === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  disabled={busy === g.threadId}
                  onClick={() => (g.joined ? router.push(`/garden/community/${g.threadId}`) : join(g))}
                  style={{
                    padding: "9px 18px", borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: "pointer",
                    background: g.joined ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #43A047, #2E7D32)",
                    color: "white", flexShrink: 0,
                    border: g.joined ? "1px solid rgba(255,255,255,0.2)" : "none",
                  }}
                >
                  {busy === g.threadId ? "…" : g.joined ? "Open" : "Join"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
