"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ScanPaywall from "@/components/ScanPaywall";
import FeedbackForm from "@/components/FeedbackForm";
import AuthScreen from "@/components/AuthScreen";

/* ─── try real auth, fall back gracefully ─── */
let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface LocalPrefs {
  units: "imperial" | "metric";
  notifications: {
    growReminders: boolean;
    scanComplete: boolean;
    weeklyDigest: boolean;
  };
  theme: "dark" | "auto";
  scanQuality: "standard" | "high";
}

const DEFAULT_PREFS: LocalPrefs = {
  units: "imperial",
  notifications: {
    growReminders: true,
    scanComplete: true,
    weeklyDigest: false,
  },
  theme: "dark",
  scanQuality: "standard",
};

const PREFS_KEY = "strainspotter_settings";

function loadPrefs(): LocalPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
function savePrefs(prefs: LocalPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ─── Style helpers ───────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.5,
        }}
      >
        {title}
      </span>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div>
        <div
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        cursor: "pointer",
        background: checked
          ? "rgba(102,187,106,0.6)"
          : "rgba(255,255,255,0.15)",
        border: "none",
        position: "relative",
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

// ─── Tier helpers ────────────────────────────────────────────────────────────
function tierLabel(t: string): string {
  if (t === "pro") return "Pro";
  if (t === "member" || t === "garden" || t === "standard" || t === "elite")
    return "Member";
  return "Free";
}
function tierBadgeColor(t: string): string {
  if (t === "pro") return "#FFD54F";
  if (t === "member" || t === "garden" || t === "standard" || t === "elite")
    return "#66BB6A";
  return "rgba(255,255,255,0.35)";
}

// ═════════════════════════════════════════════════════════════════════════════
//  Settings Page — wired to Supabase auth + localStorage fallback
// ═════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const router = useRouter();
  const auth = useOptionalAuth();

  const [prefs, setPrefs] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [displayName, setDisplayName] = useState("");
  const [locationText, setLocationText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const isLoggedIn = !!auth?.user;
  const profile = auth?.profile;
  const email = auth?.user?.email || "";
  const membership = profile?.membership || "free";
  const scansRemaining = profile?.scans_remaining ?? null;
  const tier = auth?.tier || "free";

  // Load preferences + profile data
  useEffect(() => {
    setPrefs(loadPrefs());
    setLoaded(true);
  }, []);

  // Sync profile data when auth loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setLocationText(profile.location_text || "");
    }
  }, [profile]);

  // Save local prefs
  const updatePrefs = (partial: Partial<LocalPrefs>) => {
    const updated = { ...prefs, ...partial };
    setPrefs(updated);
    savePrefs(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateNotification = (
    key: keyof LocalPrefs["notifications"],
    val: boolean
  ) => {
    updatePrefs({
      notifications: { ...prefs.notifications, [key]: val },
    });
  };

  // Save profile to Supabase
  const saveProfile = useCallback(async () => {
    if (!isLoggedIn || !auth?.session?.access_token) return;
    setSavingProfile(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.session.access_token}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          location_text: locationText.trim() || null,
        }),
      });
      auth.refreshProfile?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.warn("Profile save error:", e);
    } finally {
      setSavingProfile(false);
    }
  }, [isLoggedIn, auth, displayName, locationText]);

  const handleSignOut = async () => {
    if (auth?.signOut) {
      await auth.signOut();
      localStorage.removeItem("ss_membership_tier");
      localStorage.removeItem("ss_member_info");
      router.push("/garden/scanner");
    }
  };

  const handleClearData = () => {
    if (
      confirm(
        "⚠️ This will clear ALL local data including grows, favorites, and settings. This cannot be undone. Continue?"
      )
    ) {
      localStorage.removeItem("strainspotter_grows");
      localStorage.removeItem("strainspotter_favorites");
      localStorage.removeItem(PREFS_KEY);
      setPrefs(DEFAULT_PREFS);
    }
  };

  const getStorageSize = () => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith("strainspotter") || key.startsWith("ss_")) {
          total += (localStorage.getItem(key) || "").length * 2;
        }
      }
      if (total < 1024) return `${total} B`;
      if (total < 1048576) return `${(total / 1024).toFixed(1)} KB`;
      return `${(total / 1048576).toFixed(1)} MB`;
    } catch {
      return "N/A";
    }
  };

  if (!loaded) return null;

  return (
    <>
      <div style={{ minHeight: "100vh", color: "#fff" }}>
        {/* ── Top Bar ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={() => router.push("/garden")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              marginRight: 8,
            }}
          >
            ←
          </button>
          <span style={{ fontWeight: 800, fontSize: 18 }}>⚙️ Settings</span>
        </div>

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "20px 16px 60px",
          }}
        >
          {/* Save indicator */}
          {saved && (
            <div
              style={{
                position: "fixed",
                top: 80,
                right: 20,
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(76,175,80,0.9)",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                zIndex: 999,
              }}
            >
              ✓ Saved
            </div>
          )}

          {/* ═══ Account / Profile ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="👤" title="Account" />

            {isLoggedIn ? (
              <>
                {/* Logged-in profile fields */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Display Name
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="Your name"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Email
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(0,0,0,0.2)",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 14,
                    }}
                  >
                    {email}
                  </div>
                </div>

                <div style={{ marginBottom: 0 }}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Location
                  </div>
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="City, State"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.3)",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                {savingProfile && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 11,
                      marginTop: 8,
                    }}
                  >
                    Saving...
                  </div>
                )}
              </>
            ) : (
              /* Not logged in */
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 14,
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}
                >
                  Sign in to sync your profile, track scans, and manage your
                  membership.
                </div>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{
                    background: "linear-gradient(135deg, #43A047, #2E7D32)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 28px",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* ═══ Membership ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="🏅" title="Membership" />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderRadius: 12,
                background:
                  tier === "free"
                    ? "rgba(255,213,79,0.08)"
                    : "rgba(76,175,80,0.08)",
                border: `1px solid ${
                  tier === "free"
                    ? "rgba(255,213,79,0.2)"
                    : "rgba(76,175,80,0.2)"
                }`,
              }}
            >
              <div>
                <div
                  style={{
                    color: tierBadgeColor(tier),
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {tierLabel(tier)}
                  {tier !== "free" && " ✓"}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {tier === "free"
                    ? "Scanner + basic features"
                    : tier === "pro"
                    ? "Unlimited scans + all features"
                    : "Full Garden access + scans"}
                </div>
              </div>
              {tier === "free" && (
                <button
                  onClick={() => setShowPaywall(true)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 99,
                    background: "rgba(255,213,79,0.15)",
                    color: "#FFD54F",
                    fontSize: 12,
                    fontWeight: 700,
                    border: "1px solid rgba(255,213,79,0.3)",
                    cursor: "pointer",
                  }}
                >
                  Upgrade
                </button>
              )}
            </div>

            {/* Scans remaining — only show if logged in and available */}
            {isLoggedIn && scansRemaining !== null && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                  }}
                >
                  Scans Remaining
                </span>
                <span
                  style={{
                    color:
                      scansRemaining > 10
                        ? "#66BB6A"
                        : scansRemaining > 0
                        ? "#FFB74D"
                        : "#EF5350",
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {scansRemaining === -1 ? "∞" : scansRemaining}
                </span>
              </div>
            )}
          </div>

          {/* ═══ Scanner ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="📷" title="Scanner" />
            <SettingRow
              label="Scan Quality"
              description="Higher quality uses more data"
            >
              <div style={{ display: "flex", gap: 4 }}>
                {(["standard", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => updatePrefs({ scanQuality: q })}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      background:
                        prefs.scanQuality === q
                          ? "rgba(206,147,216,0.2)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        prefs.scanQuality === q
                          ? "#CE93D8"
                          : "rgba(255,255,255,0.5)",
                      border: `1px solid ${
                        prefs.scanQuality === q
                          ? "rgba(206,147,216,0.4)"
                          : "rgba(255,255,255,0.1)"
                      }`,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>

          {/* ═══ Notifications ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="🔔" title="Notifications" />
            <SettingRow
              label="Grow Reminders"
              description="Daily reminders to log your grow"
            >
              <Toggle
                checked={prefs.notifications.growReminders}
                onChange={(v) => updateNotification("growReminders", v)}
              />
            </SettingRow>
            <SettingRow
              label="Scan Complete"
              description="Notify when scan results are ready"
            >
              <Toggle
                checked={prefs.notifications.scanComplete}
                onChange={(v) => updateNotification("scanComplete", v)}
              />
            </SettingRow>
            <SettingRow
              label="Weekly Digest"
              description="Weekly summary of your grow progress"
            >
              <Toggle
                checked={prefs.notifications.weeklyDigest}
                onChange={(v) => updateNotification("weeklyDigest", v)}
              />
            </SettingRow>
          </div>

          {/* ═══ Preferences ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="🎨" title="Preferences" />
            <SettingRow label="Units">
              <div style={{ display: "flex", gap: 4 }}>
                {(["imperial", "metric"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => updatePrefs({ units: u })}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      background:
                        prefs.units === u
                          ? "rgba(100,181,246,0.2)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        prefs.units === u
                          ? "#64B5F6"
                          : "rgba(255,255,255,0.5)",
                      border: `1px solid ${
                        prefs.units === u
                          ? "rgba(100,181,246,0.4)"
                          : "rgba(255,255,255,0.1)"
                      }`,
                    }}
                  >
                    {u === "imperial" ? "°F / in" : "°C / cm"}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="Theme">
              <div style={{ display: "flex", gap: 4 }}>
                {(["dark", "auto"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updatePrefs({ theme: t })}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      background:
                        prefs.theme === t
                          ? "rgba(100,181,246,0.2)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        prefs.theme === t
                          ? "#64B5F6"
                          : "rgba(255,255,255,0.5)",
                      border: `1px solid ${
                        prefs.theme === t
                          ? "rgba(100,181,246,0.4)"
                          : "rgba(255,255,255,0.1)"
                      }`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>

          {/* ═══ Data & Storage ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="💾" title="Data & Storage" />
            <SettingRow label="Local Storage Used">
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {loaded ? getStorageSize() : "..."}
              </span>
            </SettingRow>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={handleClearData}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "rgba(244,67,54,0.1)",
                  color: "#EF5350",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  border: "1px solid rgba(244,67,54,0.2)",
                  cursor: "pointer",
                }}
              >
                🗑️ Clear All Local Data
              </button>
            </div>
          </div>

          {/* ═══ Sign Out (only if logged in) ═══ */}
          {isLoggedIn && (
            <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 12,
                  background: "rgba(244,67,54,0.08)",
                  border: "1px solid rgba(244,67,54,0.2)",
                  color: "#EF5350",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign Out
              </button>
            </div>
          )}

          {/* ═══ About ═══ */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="ℹ️" title="About" />
            <SettingRow label="Version">
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
              >
                1.0.0-beta
              </span>
            </SettingRow>
            <SettingRow label="Build">
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
              >
                Pre-Launch
              </span>
            </SettingRow>
          </div>

          {/* ═══ Feedback ═══ */}
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <FeedbackForm />
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <span
              style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}
            >
              StrainSpotter • AI-Powered Cannabis Identification
            </span>
          </div>
        </div>
      </div>

      {showPaywall && (
        <ScanPaywall
          mode="warning"
          onClose={() => setShowPaywall(false)}
        />
      )}

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
