"use client";

// B2B Connect hub — growers ⇄ labs ⇄ dispensaries.
// Three tabs: Directory (browse + request), Connections (respond, contact
// reveal, open chat), My Profile (create/edit + directory opt-in).
// Consumers see the profile-creation pitch; the directory API refuses callers
// without a business profile.

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

const ROLES = [
  { key: "grower", label: "Grower", icon: "🌱" },
  { key: "lab", label: "Lab", icon: "🧪" },
  { key: "dispensary", label: "Dispensary", icon: "🏪" },
  { key: "breeder", label: "Breeder", icon: "🧬" },
  { key: "processor", label: "Processor", icon: "🏭" },
] as const;

const roleMeta = (key: string | null) =>
  ROLES.find((r) => r.key === key) ?? { key: "", label: key ?? "Business", icon: "🤝" };

interface Profile {
  id: string;
  role: string | null;
  business_name: string | null;
  region: string | null;
  bio: string | null;
  license_number: string | null;
  verified: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  directory_opt_in: boolean;
  moderator_volunteer?: boolean;
  moderator_active?: boolean;
}

interface DirectoryEntry {
  id: string;
  role: string | null;
  business_name: string | null;
  region: string | null;
  bio: string | null;
  verified: boolean;
}

interface Connection {
  id: string;
  direction: "incoming" | "outgoing";
  status: string;
  message: string | null;
  threadId: string | null;
  other: { profileId: string; businessName: string | null; role: string | null; region: string | null; verified: boolean };
  contact: { email: string | null; phone: string | null } | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
  color: "white", fontSize: 14, outline: "none", marginBottom: 12,
};

function VerifiedBadge() {
  return (
    <span style={{ color: "#64B5F6", fontSize: 11, fontWeight: 800, border: "1px solid rgba(100,181,246,0.4)", background: "rgba(100,181,246,0.12)", borderRadius: 99, padding: "1px 8px" }}>
      ✓ Verified
    </span>
  );
}

export default function BusinessPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const token: string | undefined = auth?.session?.access_token;

  const [tab, setTab] = useState<"directory" | "connections" | "profile">("directory");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Profile form state
  const [fRole, setFRole] = useState<string>("grower");
  const [fName, setFName] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fBio, setFBio] = useState("");
  const [fLicense, setFLicense] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fOptIn, setFOptIn] = useState(true);
  const [fVolunteer, setFVolunteer] = useState(false);

  // Per-directory-entry request message
  const [requestTo, setRequestTo] = useState<DirectoryEntry | null>(null);
  const [requestMsg, setRequestMsg] = useState("");

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(path, { ...init, headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { code: json.code, status: res.status });
      return json;
    },
    [token]
  );

  const loadProfile = useCallback(async () => {
    if (!token) { setProfileLoaded(true); return; }
    try {
      const { profile: p } = await api("/api/b2b/profile");
      setProfile(p);
      if (p) {
        setFRole(p.role ?? "grower");
        setFName(p.business_name ?? "");
        setFRegion(p.region ?? "");
        setFBio(p.bio ?? "");
        setFLicense(p.license_number ?? "");
        setFEmail(p.contact_email ?? "");
        setFPhone(p.contact_phone ?? "");
        setFOptIn(p.directory_opt_in);
        setFVolunteer(p.moderator_volunteer === true);
      }
    } catch { /* signed out / no sub — pitch renders */ }
    setProfileLoaded(true);
  }, [api, token]);

  const loadDirectory = useCallback(async () => {
    try {
      const q = roleFilter ? `?role=${roleFilter}` : "";
      const { profiles } = await api(`/api/b2b/directory${q}`);
      setDirectory(profiles);
    } catch { setDirectory([]); }
  }, [api, roleFilter]);

  const loadConnections = useCallback(async () => {
    try {
      const { connections: c } = await api("/api/b2b/connections");
      setConnections(c);
    } catch { setConnections([]); }
  }, [api]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    if (profile) { loadDirectory(); loadConnections(); }
  }, [profile, loadDirectory, loadConnections]);

  const saveProfile = async () => {
    setBusy(true); setNotice(null);
    try {
      await api("/api/b2b/profile", {
        method: "POST",
        body: JSON.stringify({
          role: fRole, businessName: fName, region: fRegion, bio: fBio,
          licenseNumber: fLicense, contactEmail: fEmail, contactPhone: fPhone,
          directoryOptIn: fOptIn, moderatorVolunteer: fVolunteer,
        }),
      });
      setNotice("Profile saved.");
      await loadProfile();
      setTab("directory");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to save.");
    } finally { setBusy(false); }
  };

  const sendRequest = async () => {
    if (!requestTo) return;
    setBusy(true); setNotice(null);
    try {
      await api("/api/b2b/connect", {
        method: "POST",
        body: JSON.stringify({ toProfileId: requestTo.id, message: requestMsg }),
      });
      setNotice(`Request sent to ${requestTo.business_name}.`);
      setRequestTo(null); setRequestMsg("");
      loadConnections();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to send request.");
    } finally { setBusy(false); }
  };

  const respond = async (id: string, action: "accept" | "decline" | "withdraw") => {
    setBusy(true); setNotice(null);
    try {
      const { threadId } = await api("/api/b2b/connect/respond", {
        method: "POST",
        body: JSON.stringify({ requestId: id, action }),
      });
      await loadConnections();
      if (action === "accept" && threadId) router.push(`/garden/business/chat/${threadId}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action failed.");
    } finally { setBusy(false); }
  };

  const pendingIncoming = connections.filter((c) => c.direction === "incoming" && c.status === "pending");

  return (
    <>
      <TopNav title="Business" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>🤝</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Business Connect</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Growers, labs, dispensaries, breeders, and processors — find each other,
              connect by mutual consent, and talk business. Contact details are only
              shared after both sides accept.
            </div>
          </div>

          {notice && (
            <div style={{ ...glass, padding: 12, marginBottom: 14 }}>
              <span style={{ color: "#FFD54F", fontSize: 13 }}>{notice}</span>
            </div>
          )}

          {/* Signed out / no profile pitch */}
          {profileLoaded && !profile && tab !== "profile" && (
            <div style={{ ...glass, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🪪</div>
              <div style={{ color: "white", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
                Set up your business profile
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                The directory is business-to-business only. Create a profile as a grower,
                lab, dispensary, breeder, or processor to browse and connect.
                {!token && " You'll need to sign in with an active membership first."}
              </div>
              {token && (
                <button onClick={() => setTab("profile")} style={{ padding: "12px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #43A047, #2E7D32)", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  Create business profile
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          {(profile || tab === "profile") && (
            <div style={{ display: "flex", gap: 8, margin: "4px 0 16px", padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {([
                { key: "directory" as const, label: "Directory" },
                { key: "connections" as const, label: pendingIncoming.length ? `Connections (${pendingIncoming.length})` : "Connections" },
                { key: "profile" as const, label: "My Profile" },
              ]).map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: "9px 8px", borderRadius: 11, border: "none", cursor: "pointer",
                  fontWeight: 800, fontSize: 13,
                  background: tab === t.key ? "linear-gradient(135deg, #43A047, #2E7D32)" : "transparent",
                  color: tab === t.key ? "#fff" : "rgba(255,255,255,0.7)",
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ── DIRECTORY ── */}
          {tab === "directory" && profile && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[{ key: "", label: "All" }, ...ROLES.map((r) => ({ key: r.key, label: `${r.icon} ${r.label}` }))].map((r) => (
                  <button key={r.key} onClick={() => setRoleFilter(r.key)} style={{
                    padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: roleFilter === r.key ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.06)",
                    color: roleFilter === r.key ? "#81C784" : "rgba(255,255,255,0.65)",
                    border: `1px solid ${roleFilter === r.key ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                    {r.label}
                  </button>
                ))}
              </div>

              {directory.length === 0 && (
                <div style={{ ...glass, padding: 22, textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                  No businesses in the directory yet{roleFilter ? " for this role" : ""}. You&apos;re early — being listed first has its perks.
                </div>
              )}

              {directory.map((d) => (
                <div key={d.id} style={{ ...glass, padding: 18, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20 }}>{roleMeta(d.role).icon}</span>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 15 }}>{d.business_name}</span>
                    {d.verified && <VerifiedBadge />}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>
                    {roleMeta(d.role).label}{d.region ? ` · ${d.region}` : ""}
                  </div>
                  {d.bio && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>{d.bio}</div>}

                  {requestTo?.id === d.id ? (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        value={requestMsg}
                        onChange={(e) => setRequestMsg(e.target.value.slice(0, 500))}
                        placeholder="Short intro — who you are and what you're looking for…"
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={busy} onClick={sendRequest} style={{ padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #43A047, #2E7D32)", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                          Send request
                        </button>
                        <button onClick={() => setRequestTo(null)} style={{ padding: "9px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setRequestTo(d); setRequestMsg(""); }} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 11, border: "1px solid rgba(76,175,80,0.4)", background: "rgba(76,175,80,0.15)", color: "#81C784", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                      🤝 Connect
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── CONNECTIONS ── */}
          {tab === "connections" && profile && (
            <>
              {connections.length === 0 && (
                <div style={{ ...glass, padding: 22, textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                  No connections yet. Browse the directory and introduce yourself.
                </div>
              )}
              {connections.map((c) => (
                <div key={c.id} style={{ ...glass, padding: 18, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20 }}>{roleMeta(c.other.role).icon}</span>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 15 }}>{c.other.businessName}</span>
                    {c.other.verified && <VerifiedBadge />}
                    <span style={{
                      marginLeft: "auto", fontSize: 11, fontWeight: 800, borderRadius: 99, padding: "2px 10px",
                      color: c.status === "accepted" ? "#81C784" : c.status === "pending" ? "#FFD54F" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${c.status === "accepted" ? "rgba(76,175,80,0.4)" : c.status === "pending" ? "rgba(255,213,79,0.4)" : "rgba(255,255,255,0.2)"}`,
                    }}>
                      {c.status === "pending" ? (c.direction === "incoming" ? "wants to connect" : "request sent") : c.status}
                    </span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 3 }}>
                    {roleMeta(c.other.role).label}{c.other.region ? ` · ${c.other.region}` : ""}
                  </div>
                  {c.message && c.status === "pending" && (
                    <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.6, marginTop: 8, fontStyle: "italic" }}>
                      &ldquo;{c.message}&rdquo;
                    </div>
                  )}

                  {c.status === "pending" && c.direction === "incoming" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button disabled={busy} onClick={() => respond(c.id, "accept")} style={{ padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #43A047, #2E7D32)", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                        Accept
                      </button>
                      <button disabled={busy} onClick={() => respond(c.id, "decline")} style={{ padding: "9px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        Decline
                      </button>
                    </div>
                  )}
                  {c.status === "pending" && c.direction === "outgoing" && (
                    <button disabled={busy} onClick={() => respond(c.id, "withdraw")} style={{ marginTop: 12, padding: "8px 14px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      Withdraw
                    </button>
                  )}

                  {c.status === "accepted" && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
                        {c.contact?.email && (
                          <a href={`mailto:${c.contact.email}`} style={{ color: "#64B5F6", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>✉️ {c.contact.email}</a>
                        )}
                        {c.contact?.phone && (
                          <a href={`tel:${c.contact.phone}`} style={{ color: "#64B5F6", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>📞 {c.contact.phone}</a>
                        )}
                      </div>
                      {c.threadId && (
                        <button onClick={() => router.push(`/garden/business/chat/${c.threadId}`)} style={{ padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #43A047, #2E7D32)", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                          💬 Open chat
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── MY PROFILE ── */}
          {tab === "profile" && (
            <div style={{ ...glass, padding: 20 }}>
              <div style={{ color: "white", fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
                {profile ? "Edit business profile" : "Create business profile"}
                {profile?.verified && <span style={{ marginLeft: 8 }}><VerifiedBadge /></span>}
              </div>

              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>I AM A…</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {ROLES.map((r) => (
                  <button key={r.key} onClick={() => setFRole(r.key)} style={{
                    padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: fRole === r.key ? "rgba(76,175,80,0.25)" : "rgba(255,255,255,0.06)",
                    color: fRole === r.key ? "#81C784" : "rgba(255,255,255,0.65)",
                    border: `1px solid ${fRole === r.key ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>

              <input style={inputStyle} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Business name *" maxLength={120} />
              <input style={inputStyle} value={fRegion} onChange={(e) => setFRegion(e.target.value)} placeholder="Region (e.g. Arkansas)" maxLength={80} />
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={fBio} onChange={(e) => setFBio(e.target.value.slice(0, 1000))} placeholder="What you do, what you're looking for…" />
              <input style={inputStyle} value={fLicense} onChange={(e) => setFLicense(e.target.value)} placeholder="License # (self-reported, shown as Verified after review)" maxLength={80} />
              <input style={inputStyle} value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="Business email (shared only with accepted connections)" maxLength={200} />
              <input style={inputStyle} value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="Business phone (shared only with accepted connections)" maxLength={40} />

              <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 12px", cursor: "pointer" }}>
                <input type="checkbox" checked={fOptIn} onChange={(e) => setFOptIn(e.target.checked)} />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                  List my business in the directory so others can find and contact me
                </span>
              </label>

              {/* The moderator ask */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "0 0 16px", cursor: "pointer", padding: "12px 14px", borderRadius: 12, background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.25)" }}>
                <input type="checkbox" checked={fVolunteer} onChange={(e) => setFVolunteer(e.target.checked)} style={{ marginTop: 2 }} />
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.6 }}>
                  <strong>🌿 Help keep our atmosphere clean and healthy</strong> — I&apos;d like to
                  volunteer as a community group moderator. Approved moderators get a
                  few bonus scans to start.
                  {profile?.moderator_active && (
                    <span style={{ display: "block", color: "#81C784", fontWeight: 800, marginTop: 4 }}>
                      ✓ You&apos;re an active moderator — thank you!
                    </span>
                  )}
                </span>
              </label>

              <button disabled={busy || !fName.trim() || !token} onClick={saveProfile} style={{
                width: "100%", padding: "13px 18px", borderRadius: 12, border: "none",
                background: !fName.trim() || !token ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #43A047, #2E7D32)",
                color: "white", fontWeight: 800, fontSize: 15, cursor: busy ? "default" : "pointer",
              }}>
                {busy ? "Saving…" : profile ? "Save changes" : "Create profile"}
              </button>
              {!token && (
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 10, textAlign: "center" }}>
                  Sign in with an active membership to create a business profile.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
