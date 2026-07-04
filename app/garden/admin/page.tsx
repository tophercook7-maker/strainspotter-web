"use client";

// Owner admin console — /garden/admin
// Tabs: Overview (stats + the Moderator Box), Verify (license → badge),
// Moderators (approve volunteers w/ scan bonus, remove), Feedback (2-way).
// The API is the enforcement (profiles.is_owner); this page just refuses to
// render for non-owners.

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

const ROLE_ICONS: Record<string, string> = {
  grower: "🌱", lab: "🧪", dispensary: "🏪", breeder: "🧬", processor: "🏭",
};

interface AdminProfile {
  id: string;
  user_id: string;
  role: string | null;
  business_name: string | null;
  region: string | null;
  license_number: string | null;
  verified: boolean;
  moderator_volunteer: boolean;
  moderator_active: boolean;
  created_at: string;
}

interface Overview {
  businesses: { total: number; byRole: Record<string, number>; verified: number; directoryOptIn: number };
  pendingVerifications: AdminProfile[];
  volunteers: { pending: AdminProfile[]; active: AdminProfile[] };
  moderatorBox: { threadId: string; name: string; moderatorCount: number; moderators: { userId: string; businessName: string | null; role: string | null }[] }[];
  feedbackCounts: Record<string, number>;
  openReports: number;
}

interface ReportGroup {
  message: { id: string; content: string; hidden: boolean; senderName: string; groupName: string; threadId: string };
  reportCount: number;
  reasons: string[];
  firstReportedAt: string;
}

interface FeedbackItem {
  id: string;
  category: string;
  content: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 11, border: "none",
  background: "linear-gradient(135deg, #43A047, #2E7D32)",
  color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent", color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

export default function AdminPage() {
  const auth = useOptionalAuth();
  const token: string | undefined = auth?.session?.access_token;
  const isOwner = auth?.profile?.is_owner === true;

  const [tab, setTab] = useState<"overview" | "verify" | "moderators" | "reports" | "feedback">("overview");
  const [ov, setOv] = useState<Overview | null>(null);
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [fbFilter, setFbFilter] = useState<string>("new");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(path, { ...init, headers });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) setDenied(true);
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      return json;
    },
    [token]
  );

  const loadOverview = useCallback(async () => {
    if (!token) return;
    try { setOv(await api("/api/admin/overview")); } catch { /* denied state handles */ }
  }, [api, token]);

  const loadFeedback = useCallback(async () => {
    if (!token) return;
    try {
      const q = fbFilter === "all" ? "" : `?status=${fbFilter}`;
      const { feedback: f } = await api(`/api/admin/feedback${q}`);
      setFeedback(f);
    } catch { /* noop */ }
  }, [api, token, fbFilter]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    try {
      const { reports } = await api("/api/admin/reports");
      setReportGroups(reports);
    } catch { /* noop */ }
  }, [api, token]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === "feedback") loadFeedback(); }, [tab, loadFeedback]);
  useEffect(() => { if (tab === "reports") loadReports(); }, [tab, loadReports]);

  // ── Strain-library enrichment (owner-triggered, runs server-side) ──
  const [enrichStats, setEnrichStats] = useState<{ withDescription: number; enriched: number; total: number } | null>(null);
  const [enrichRunning, setEnrichRunning] = useState(false);
  const [enrichLog, setEnrichLog] = useState<string>("");

  const loadEnrichStats = useCallback(async () => {
    if (!token) return;
    try { setEnrichStats(await api("/api/admin/enrich")); } catch { /* noop */ }
  }, [api, token]);
  useEffect(() => { if (tab === "overview") loadEnrichStats(); }, [tab, loadEnrichStats]);

  const runEnrichment = async () => {
    if (enrichRunning) { setEnrichRunning(false); return; } // acts as Stop
    setEnrichRunning(true);
    let totalDone = 0;
    try {
      // Auto-loop batches while the tab is open; each batch ≈ 10 strains ≈ 1-2¢.
      for (let i = 0; i < 200; i++) {
        const r = await api("/api/admin/enrich", { method: "POST" });
        totalDone += r.enriched ?? 0;
        setEnrichLog(`Batch ${i + 1}: +${r.enriched} enriched (${r.skippedUnknown} unknown) — ${totalDone} this session`);
        await loadEnrichStats();
        if (r.exhausted || r.failed > 5) break;
        // React state in a loop closure: re-read via functional check
        let stopped = false;
        setEnrichRunning((v) => { stopped = !v; return v; });
        if (stopped) break;
      }
    } catch (e) {
      setEnrichLog(e instanceof Error ? e.message : "Enrichment failed");
    } finally {
      setEnrichRunning(false);
    }
  };

  const actOnReport = async (messageId: string, action: "hide_resolve" | "resolve") => {
    setBusy(true); setNotice(null);
    try {
      await api("/api/admin/reports", { method: "POST", body: JSON.stringify({ messageId, action }) });
      setNotice(action === "hide_resolve" ? "Message hidden and reports resolved." : "Reports dismissed.");
      await Promise.all([loadReports(), loadOverview()]);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Failed."); }
    finally { setBusy(false); }
  };

  const setVerified = async (profileId: string, verified: boolean) => {
    setBusy(true); setNotice(null);
    try {
      await api("/api/admin/verify", { method: "POST", body: JSON.stringify({ profileId, verified }) });
      setNotice(verified ? "Verified ✓" : "Verification removed.");
      await loadOverview();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Failed."); }
    finally { setBusy(false); }
  };

  const moderator = async (profileId: string, action: "approve" | "remove") => {
    setBusy(true); setNotice(null);
    try {
      const res = await api("/api/admin/moderator", { method: "POST", body: JSON.stringify({ profileId, action }) });
      setNotice(action === "approve" ? `Moderator approved — ${res.bonusGranted ?? 0} bonus scans granted.` : "Moderator removed.");
      await loadOverview();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Failed."); }
    finally { setBusy(false); }
  };

  const sendReply = async (feedbackId: string, status?: string) => {
    setBusy(true); setNotice(null);
    try {
      await api("/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ feedbackId, reply: replyText.trim() || undefined, status }),
      });
      setReplyFor(null); setReplyText("");
      setNotice("Saved.");
      await Promise.all([loadFeedback(), loadOverview()]);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Failed."); }
    finally { setBusy(false); }
  };

  const Card = ({ p, children }: { p: AdminProfile; children?: React.ReactNode }) => (
    <div style={{ ...glass, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 18 }}>{ROLE_ICONS[p.role ?? ""] ?? "🤝"}</span>
        <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{p.business_name}</span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
          {p.role}{p.region ? ` · ${p.region}` : ""}
        </span>
      </div>
      {p.license_number && (
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 }}>
          License #: <span style={{ color: "white", fontWeight: 700 }}>{p.license_number}</span>
        </div>
      )}
      {children}
    </div>
  );

  if (!token || denied || (auth?.profile && !isOwner)) {
    return (
      <>
        <TopNav title="Admin" showBack />
        <main className="min-h-screen text-white">
          <div className="mx-auto w-full max-w-[720px] px-4 py-16" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>Owner access only.</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav title="Admin" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", flexWrap: "wrap" }}>
            {([
              { key: "overview" as const, label: "Overview" },
              { key: "verify" as const, label: ov?.pendingVerifications.length ? `Verify (${ov.pendingVerifications.length})` : "Verify" },
              { key: "moderators" as const, label: ov?.volunteers.pending.length ? `Moderators (${ov.volunteers.pending.length})` : "Moderators" },
              { key: "reports" as const, label: ov?.openReports ? `Reports (${ov.openReports})` : "Reports" },
              { key: "feedback" as const, label: ov?.feedbackCounts?.new ? `Feedback (${ov.feedbackCounts.new})` : "Feedback" },
            ]).map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, minWidth: 100, padding: "9px 8px", borderRadius: 11, border: "none", cursor: "pointer",
                fontWeight: 800, fontSize: 12.5,
                background: tab === t.key ? "linear-gradient(135deg, #43A047, #2E7D32)" : "transparent",
                color: tab === t.key ? "#fff" : "rgba(255,255,255,0.7)",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {notice && (
            <div style={{ ...glass, padding: 12, marginBottom: 14 }}>
              <span style={{ color: "#FFD54F", fontSize: 13 }}>{notice}</span>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === "overview" && ov && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Businesses", value: ov.businesses.total },
                  { label: "Verified", value: ov.businesses.verified },
                  { label: "In directory", value: ov.businesses.directoryOptIn },
                  { label: "New feedback", value: ov.feedbackCounts.new ?? 0 },
                ].map((s) => (
                  <div key={s.label} style={{ ...glass, padding: 16, textAlign: "center" }}>
                    <div style={{ color: "white", fontWeight: 900, fontSize: 26 }}>{s.value}</div>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {Object.keys(ov.businesses.byRole).length > 0 && (
                <div style={{ ...glass, padding: 16, marginBottom: 16 }}>
                  <div style={{ color: "white", fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Businesses by role</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {Object.entries(ov.businesses.byRole).map(([role, n]) => (
                      <span key={role} style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                        {ROLE_ICONS[role] ?? "🤝"} {role}: <strong>{n}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── THE MODERATOR BOX ── */}
              <div style={{ ...glass, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>🛡️ Moderator Box</div>
                  <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                    {ov.volunteers.active.length} active · {ov.volunteers.pending.length} pending
                  </span>
                </div>
                {ov.moderatorBox.map((g) => (
                  <div key={g.threadId} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 13.5 }}>{g.name}</span>
                      <span style={{
                        fontWeight: 900, fontSize: 13, borderRadius: 99, padding: "2px 12px",
                        color: g.moderatorCount > 0 ? "#81C784" : "#FFB74D",
                        border: `1px solid ${g.moderatorCount > 0 ? "rgba(76,175,80,0.4)" : "rgba(255,183,77,0.4)"}`,
                      }}>
                        {g.moderatorCount} mod{g.moderatorCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    {g.moderators.length > 0 && (
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 }}>
                        {g.moderators.map((m) => m.businessName ?? "Unnamed").join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
                {ov.volunteers.pending.length > 0 && (
                  <button onClick={() => setTab("moderators")} style={{ ...btnPrimary, marginTop: 12 }}>
                    Review {ov.volunteers.pending.length} volunteer{ov.volunteers.pending.length === 1 ? "" : "s"} →
                  </button>
                )}
              </div>
            </>
          )}

          {tab === "overview" && ov && (
            <div style={{ ...glass, padding: 18, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>📚 Strain Library Enrichment</div>
                {enrichStats && (
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                    {enrichStats.withDescription.toLocaleString()} / {enrichStats.total.toLocaleString()} described · {enrichStats.enriched.toLocaleString()} AI-enriched
                  </span>
                )}
              </div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
                Fills empty strain records (descriptions, effects, THC, lineage) from AI knowledge —
                famous strains first, unknowns skipped, ~1-2¢ per batch of 10. Keep this tab open while it runs.
              </div>
              <button disabled={!token} onClick={runEnrichment} style={{
                padding: "10px 18px", borderRadius: 11, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer",
                background: enrichRunning ? "rgba(255,183,77,0.2)" : "linear-gradient(135deg, #43A047, #2E7D32)",
                color: enrichRunning ? "#FFB74D" : "white",
              }}>
                {enrichRunning ? "⏸ Stop after this batch" : "▶ Enrich the library"}
              </button>
              {enrichLog && (
                <div style={{ color: "#81C784", fontSize: 12, marginTop: 8 }}>{enrichLog}</div>
              )}
            </div>
          )}

          {/* ── VERIFY ── */}
          {tab === "verify" && ov && (
            <>
              {ov.pendingVerifications.length === 0 && (
                <div style={{ ...glass, padding: 20, textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
                  No pending verifications — every submitted license has been reviewed.
                </div>
              )}
              {ov.pendingVerifications.map((p) => (
                <Card key={p.id} p={p}>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={busy} onClick={() => setVerified(p.id, true)} style={btnPrimary}>✓ Verify</button>
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* ── MODERATORS ── */}
          {tab === "moderators" && ov && (
            <>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Volunteers awaiting approval
              </div>
              {ov.volunteers.pending.length === 0 && (
                <div style={{ ...glass, padding: 16, marginBottom: 16, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  No pending volunteers right now.
                </div>
              )}
              {ov.volunteers.pending.map((p) => (
                <Card key={p.id} p={p}>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={busy} onClick={() => moderator(p.id, "approve")} style={btnPrimary}>
                      🛡️ Approve (+10 scans)
                    </button>
                  </div>
                </Card>
              ))}

              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>
                Active moderators
              </div>
              {ov.volunteers.active.length === 0 && (
                <div style={{ ...glass, padding: 16, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  No active moderators yet.
                </div>
              )}
              {ov.volunteers.active.map((p) => (
                <Card key={p.id} p={p}>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={busy} onClick={() => moderator(p.id, "remove")} style={btnGhost}>Remove moderator</button>
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* ── REPORTS ── */}
          {tab === "reports" && (
            <>
              {reportGroups.length === 0 && (
                <div style={{ ...glass, padding: 20, textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
                  No open reports — the atmosphere is clean. 🌿
                </div>
              )}
              {reportGroups.map((g) => (
                <div key={g.message.id} style={{ ...glass, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ color: "#FFB74D", fontSize: 11, fontWeight: 900 }}>
                      ⚑ {g.reportCount} report{g.reportCount === 1 ? "" : "s"}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{g.message.groupName}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{new Date(g.firstReportedAt).toLocaleDateString()}</span>
                    {g.message.hidden && (
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700 }}>already hidden</span>
                    )}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginBottom: 4 }}>
                    <strong style={{ color: "white" }}>{g.message.senderName}</strong> wrote:
                  </div>
                  <div style={{ color: "white", fontSize: 14, lineHeight: 1.6, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
                    {g.message.content}
                  </div>
                  {g.reasons.length > 0 && (
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 6 }}>
                      Reasons: {g.reasons.join(" · ")}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {!g.message.hidden && (
                      <button disabled={busy} onClick={() => actOnReport(g.message.id, "hide_resolve")} style={btnPrimary}>
                        Hide & resolve
                      </button>
                    )}
                    <button disabled={busy} onClick={() => actOnReport(g.message.id, "resolve")} style={btnGhost}>
                      Dismiss (message is fine)
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── FEEDBACK ── */}
          {tab === "feedback" && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["new", "replied", "closed", "all"].map((s) => (
                  <button key={s} onClick={() => setFbFilter(s)} style={{
                    padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: fbFilter === s ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.06)",
                    color: fbFilter === s ? "#81C784" : "rgba(255,255,255,0.65)",
                    border: `1px solid ${fbFilter === s ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                    {s}
                  </button>
                ))}
              </div>
              {feedback.length === 0 && (
                <div style={{ ...glass, padding: 20, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                  Nothing here.
                </div>
              )}
              {feedback.map((f) => (
                <div key={f.id} style={{ ...glass, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "#FFD54F", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{f.category}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{new Date(f.created_at).toLocaleDateString()}</span>
                    <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700 }}>{f.status}</span>
                  </div>
                  <div style={{ color: "white", fontSize: 14, lineHeight: 1.6 }}>{f.content}</div>
                  {f.admin_reply && (
                    <div style={{ color: "#81C784", fontSize: 13, lineHeight: 1.6, marginTop: 8, paddingLeft: 10, borderLeft: "2px solid rgba(76,175,80,0.5)" }}>
                      You replied: {f.admin_reply}
                    </div>
                  )}
                  {replyFor === f.id ? (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
                        rows={3}
                        placeholder="Your reply — the user sees this on their Feedback page…"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 13, outline: "none", resize: "vertical", marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={busy || !replyText.trim()} onClick={() => sendReply(f.id)} style={btnPrimary}>Send reply</button>
                        <button onClick={() => { setReplyFor(null); setReplyText(""); }} style={btnGhost}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => { setReplyFor(f.id); setReplyText(""); }} style={btnPrimary}>Reply</button>
                      {f.status !== "closed" && (
                        <button disabled={busy} onClick={() => sendReply(f.id, "closed")} style={btnGhost}>Close</button>
                      )}
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
