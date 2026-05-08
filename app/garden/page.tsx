"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import MembershipCTA from "@/components/MembershipCTA";
import { useState, useEffect } from "react";
import AuthScreen from "@/components/AuthScreen";

/* ─── try to use real auth, fall back to localStorage tier ─── */
let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

function getLocalTier(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("ss_membership_tier");
  } catch {
    return null;
  }
}

/* ─── Strain of the Day component ─── */
interface DailyStrain {
  name: string; type: string; description: string;
  effects: string[]; flavors: string[];
  thc: number | null; cbd: number | null;
}

const TYPE_COLOR: Record<string, { border: string; badge: string; text: string }> = {
  Sativa: { border: "#FFD54F", badge: "rgba(255,213,79,0.15)", text: "#FFD54F" },
  Indica: { border: "#9575CD", badge: "rgba(149,117,205,0.15)", text: "#9575CD" },
  Hybrid: { border: "#66BB6A", badge: "rgba(102,187,106,0.15)", text: "#66BB6A" },
};

function StrainOfTheDay({ router }: { router: ReturnType<typeof useRouter> }) {
  const [strain, setStrain] = useState<DailyStrain | null>(null);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/strain-of-the-day")
      .then((r) => r.json())
      .then((d) => { setStrain(d.strain ?? null); setDate(d.date ?? ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const colors = TYPE_COLOR[strain?.type ?? "Hybrid"] ?? TYPE_COLOR.Hybrid;

  const dayLabel = (() => {
    if (!date) return "Today";
    const d = new Date(date + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  })();

  return (
    <div style={{
      borderRadius: 18,
      border: `1px solid ${colors.border}33`,
      borderLeft: `3px solid ${colors.border}`,
      background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      padding: "18px 18px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: -30, right: -30, width: 120, height: 120,
        borderRadius: "50%", background: `${colors.border}12`, pointerEvents: "none",
      }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
            🌟 Strain of the Day
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8 }}>
            {dayLabel}
          </div>
          {loading ? (
            <div style={{ height: 22, width: 140, borderRadius: 6, background: "rgba(255,255,255,0.07)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ) : (
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.2 }}>
              {strain?.name ?? "—"}
            </div>
          )}
        </div>
        {!loading && strain && (
          <div style={{
            padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: colors.badge, color: colors.text, flexShrink: 0, marginTop: 4,
          }}>
            {strain.type}
          </div>
        )}
      </div>

      {/* THC / CBD pills */}
      {!loading && strain && (strain.thc || strain.cbd) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {strain.thc != null && strain.thc > 0 && (
            <span style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
              background: "rgba(102,187,106,0.12)", color: "#81C784",
              border: "1px solid rgba(102,187,106,0.2)",
            }}>
              THC {strain.thc}%
            </span>
          )}
          {strain.cbd != null && strain.cbd > 0 && (
            <span style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
              background: "rgba(79,195,247,0.1)", color: "#4FC3F7",
              border: "1px solid rgba(79,195,247,0.2)",
            }}>
              CBD {strain.cbd}%
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {!loading && strain?.description && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, marginBottom: 12, margin: "0 0 12px" }}>
          {strain.description.length > 130 ? strain.description.slice(0, 130) + "…" : strain.description}
        </p>
      )}

      {/* Effects */}
      {!loading && strain && strain.effects.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {strain.effects.slice(0, 5).map((e) => (
            <span key={e} style={{
              padding: "3px 8px", borderRadius: 5, fontSize: 13,
              background: "rgba(102,187,106,0.1)", color: "#81C784",
              border: "1px solid rgba(102,187,106,0.15)",
            }}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {!loading && strain && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => router.push(`/garden/strains?q=${encodeURIComponent(strain.name)}`)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: `${colors.border}22`, border: `1px solid ${colors.border}44`,
              color: colors.text, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Full Profile
          </button>
          <button
            onClick={() => router.push("/garden/scanner")}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            📸 Scan to Find It
          </button>
        </div>
      )}

      {loading && (
        <div style={{ height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)" }} />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

/* ─── User Stats component ─── */
interface UserStatsData {
  totalScans: number;
  distinctStrains: number;
  avgConfidence: number;
  ratingsGiven: number;
  photosUploaded: number;
}

function UserStats({ auth }: { auth: any }) {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const token = auth?.session?.access_token;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch("/api/user-stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setStats(d.totalScans != null ? d : null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!token || (!loading && !stats)) return null;

  const items = [
    { label: "Scans", value: stats?.totalScans ?? 0, icon: "📸" },
    { label: "Strains", value: stats?.distinctStrains ?? 0, icon: "🔬" },
    { label: "Avg Match", value: stats?.avgConfidence ? `${stats.avgConfidence}%` : "—", icon: "🎯" },
    { label: "Rated", value: stats?.ratingsGiven ?? 0, icon: "⭐" },
  ];

  return (
    <div style={{
      borderRadius: 16,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.68)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
        Your Stats
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {items.map((item) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            {loading ? (
              <>
                <div style={{ height: 24, width: "60%", margin: "0 auto 6px", borderRadius: 4, background: "rgba(255,255,255,0.07)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 10, width: "80%", margin: "0 auto", borderRadius: 4, background: "rgba(255,255,255,0.05)", animation: "pulse 1.5s ease-in-out infinite" }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1, marginBottom: 4 }}>
                  {item.value}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {item.label}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature data ─── */
interface FeatureItem {
  href: string;
  icon: string;
  label: string;
  desc: string;
  comingSoon?: boolean;
  comingSoonLabel?: string;
}

/**
 * Five primary destinations (the consolidated garden).
 * Each tile is a "zone" that absorbs related routes:
 *
 *   Scan      → scanner, history, saved-scan
 *   Grow      → grow-coach (doctor + diagnostic), plants, grow-groups, grow-log
 *   Library   → strains, ecosystem, compare, terpenes, favorites
 *   Journal   → consumption / session diary
 *   Nearby    → dispensaries + seed-vendors
 */
const FEATURES: FeatureItem[] = [
  { href: "/garden/scanner",      icon: "📷", label: "Scan",    desc: "AI strain analysis + seller's-claim check" },
  { href: "/garden/grow-coach",   icon: "🩺", label: "Grow",    desc: "Grow Doctor: lifecycle + photo diagnostics" },
  { href: "/garden/strains",      icon: "📚", label: "Library", desc: "Strains, terpenes, discovery, compare" },
  { href: "/garden/journal",      icon: "📓", label: "Journal", desc: "Session diary — mood, dose, notes" },
  { href: "/garden/dispensaries", icon: "📍", label: "Nearby",  desc: "Dispensaries & seed vendors" },
  {
    href: "/garden/community",
    icon: "💬",
    label: "Community",
    desc: "Grower & dispensary networking — connect, share, learn",
    comingSoon: true,
    comingSoonLabel: "Coming v2.0",
  },
];

const QUICK_LINKS = [
  { href: "/garden/history",   icon: "📋", label: "Scan History" },
  { href: "/garden/favorites", icon: "❤️", label: "Favorites" },
  { href: "/garden/profile",   icon: "👤", label: "Profile" },
  { href: "/garden/settings",  icon: "⚙️", label: "Settings" },
];

/* ─── Tier display helpers ─── */
function tierLabel(t: string): string {
  if (t === "pro") return "Pro";
  if (t === "member") return "Member";
  return "Free";
}
function tierColor(t: string): string {
  if (t === "pro") return "#FFD700";
  if (t === "member") return "#4CAF50";
  return "rgba(255,255,255,0.68)";
}

/* ═══════════════════════════════════════════════════════════
   Garden Hub
   ═══════════════════════════════════════════════════════════ */
export default function GardenPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const [showAuth, setShowAuth] = useState(false);

  const isLoggedIn = !!auth?.user;
  const displayName = auth?.profile?.display_name || auth?.user?.email?.split("@")[0] || null;
  const tier = auth?.tier || getLocalTier() || "free";

  return (
    <>
      <div className="min-h-screen text-white">
        {/* ── Top Bar ── */}
        <div
          style={{
            position: "sticky", top: 0, zIndex: 50, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Back → Scanner */}
          <button
            onClick={() => router.push("/garden/scanner")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              color: "rgba(255,255,255,0.7)", background: "none", border: "none",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            ‹ Scanner
          </button>

          <h1 style={{ color: "white", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <img src="/brand/cannabis-icon.png" width={20} height={20} alt="" style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', borderRadius: '50%' }} /> The Garden
          </h1>

          {/* Login / Profile */}
          {isLoggedIn ? (
            <button
              onClick={() => router.push("/garden/settings")}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: "none", cursor: "pointer", padding: "4px 0",
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5,
                color: tierColor(tier), background: `${tierColor(tier)}18`,
                border: `1px solid ${tierColor(tier)}44`, borderRadius: 6, padding: "3px 8px",
              }}>
                {tierLabel(tier)}
              </span>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #43A047, #2E7D32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#fff",
              }}>
                {(displayName || "?")[0].toUpperCase()}
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{
                background: "linear-gradient(135deg, #43A047, #2E7D32)",
                border: "none", borderRadius: 10, padding: "7px 14px",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Sign In
            </button>
          )}
        </div>

        <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-8">
          {/* Scanner Shortcut */}
          <button
            onClick={() => router.push("/garden/scanner")}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "18px 20px",
              background: "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(56,142,60,0.08))",
              border: "1px solid rgba(76,175,80,0.3)", borderRadius: 16,
              cursor: "pointer", color: "inherit", textAlign: "left",
            }}
          >
            <span style={{
              fontSize: 32, width: 52, height: 52,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(76,175,80,0.2)", borderRadius: 14,
            }}>
              📸
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Scanner</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>
                AI strain identification — snap &amp; analyze
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 18, color: "rgba(255,255,255,0.65)" }}>→</span>
          </button>

          {/* Membership nudge for unsubscribed users (renders null otherwise) */}
          <MembershipCTA variant="banner" />

          {/* Strain of the Day */}
          <StrainOfTheDay router={router} />

          {/* Feature Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {FEATURES.map((item) => {
              if (item.comingSoon) {
                const isClickable = item.href && item.href !== "#";
                return (
                  <button
                    key={item.href}
                    onClick={() => isClickable && router.push(item.href)}
                    disabled={!isClickable}
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "18px 20px",
                      background: "linear-gradient(135deg, rgba(102,187,106,0.06), rgba(46,125,50,0.03))",
                      border: "1px solid rgba(102,187,106,0.18)",
                      borderRadius: 16,
                      cursor: isClickable ? "pointer" : "default",
                      position: "relative",
                      overflow: "hidden",
                      textAlign: "left" as const,
                      color: "inherit",
                      font: "inherit",
                      width: "100%",
                    }}
                  >
                    {/* Subtle glow */}
                    <div style={{
                      position: "absolute", top: -20, right: -20, width: 100, height: 100,
                      borderRadius: "50%", background: "rgba(102,187,106,0.06)", pointerEvents: "none",
                    }} />
                    <span style={{
                      fontSize: 32, width: 52, height: 52, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(102,187,106,0.1)", borderRadius: 14,
                      filter: "grayscale(0.2)",
                    }}>
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{item.label}</span>
                        <span style={{
                          fontSize: 13, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                          background: "rgba(102,187,106,0.15)", color: "#81C784",
                          border: "1px solid rgba(102,187,106,0.25)", letterSpacing: 0.8,
                          textTransform: "uppercase" as const,
                        }}>
                          {item.comingSoonLabel}
                        </span>
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.4 }}>{item.desc}</span>
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {["Grower ↔ Consumer", "Dispensary threads", "Group channels"].map((tag) => (
                          <span key={tag} style={{
                            fontSize: 12, padding: "2px 8px", borderRadius: 20,
                            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.65)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    padding: "16px 14px",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    borderRadius: 14, textDecoration: "none", color: "inherit",
                    backdropFilter: "blur(18px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(18px) saturate(1.4)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.32)",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{item.label}</span>
                  <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.3 }}>{item.desc}</span>
                </Link>
              );
            })}
          </div>

          {/* User Stats */}
          <UserStats auth={auth} />

          {/* Quick Links */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, paddingTop: 8, paddingBottom: 16 }}>
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>

          {/* Footer credit */}
          <div style={{ textAlign: "center", paddingBottom: 32 }}>
            <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, marginBottom: 4 }}>
              StrainSpotter • Scan. Grow. Learn. Honestly.
            </div>
            <a
              href="https://mixedmakershop.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "rgba(255,255,255,0.18)", fontSize: 13, textDecoration: "none" }}
            >
              Made by mixedmakershop.com
            </a>
          </div>
        </div>
      </div>

      {/* Auth overlay */}
      {showAuth && (
        <AuthScreen
          defaultMode="signin"
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
          }}
        />
      )}
    </>
  );
}
