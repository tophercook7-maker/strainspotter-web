"use client";

import { apiUrl } from "@/lib/config/apiBase";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ScanPaywall from "@/components/ScanPaywall";
import FeedbackForm from "@/components/FeedbackForm";
import AuthScreen from "@/components/AuthScreen";
import { useMembershipPlan } from "@/lib/auth/useMembershipPlan";
import SSBadge from "@/components/ui/SSBadge";
import SSButton from "@/components/ui/SSButton";
import SSCard from "@/components/ui/SSCard";
import SSNotice from "@/components/ui/SSNotice";

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

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span
        style={{
          color: "#fff",
          fontSize: 13,
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
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              marginTop: 3,
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
      type="button"
      aria-label={checked ? "Turn setting off" : "Turn setting on"}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        padding: 3,
        cursor: "pointer",
        background: checked ? "#43A047" : "rgba(255,255,255,0.20)",
        border: "none",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          transform: checked ? "translateX(22px)" : "translateX(0)",
          transition: "transform 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ─── Tier helpers ────────────────────────────────────────────────────────────
function tierLabel(t: string): string {
  if (t === "pro") return "Pro";
  if (t === "member") return "Member";
  return "Free";
}
function tierBadgeColor(t: string): string {
  if (t === "pro") return "#FFD54F";
  if (t === "member") return "#66BB6A";
  return "rgba(255,255,255,0.6)";
}

// ═════════════════════════════════════════════════════════════════════════════
//  Settings Page — wired to Supabase auth + localStorage fallback
// ═════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const {
    membershipPlanTier: planTier,
    entitlementsStatus,
    scanEntitlements,
  } = useMembershipPlan();

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
  const scansRemaining = profile?.scans_remaining ?? null;

  const scansRow =
    isLoggedIn && entitlementsStatus === "ok" && scanEntitlements
      ? {
          label:
            scanEntitlements.tier === "free"
              ? "Free scans remaining"
              : scanEntitlements.isUnlimited
                ? "Plan scans"
                : "Scans this period",
          value: scanEntitlements.tier === "free"
            ? String(scanEntitlements.freeScansRemaining)
            : scanEntitlements.isUnlimited
              ? "∞"
              : String(scanEntitlements.memberScansRemaining),
          hint:
            scanEntitlements.tier !== "free" &&
            !scanEntitlements.isUnlimited &&
            scanEntitlements.topupScansAvailable > 0
              ? `${scanEntitlements.topupScansAvailable} top-up available`
              : null,
        }
      : isLoggedIn && scansRemaining !== null
        ? {
            label: "Scans remaining",
            value: scansRemaining === -1 ? "∞" : String(scansRemaining),
            hint: null as string | null,
          }
        : null;

  const scansValueColor = (() => {
    if (!scansRow) return "#66BB6A";
    if (scansRow.value === "∞") return "#66BB6A";
    const n = Number(scansRow.value);
    if (!Number.isFinite(n)) return "#fff";
    if (n > 10) return "#66BB6A";
    if (n > 0) return "#FFB74D";
    return "#EF5350";
  })();

  useEffect(() => {
    setPrefs(loadPrefs());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setLocationText(profile.location_text || "");
    }
  }, [profile]);

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

  const saveProfile = useCallback(async () => {
    if (!isLoggedIn || !auth?.session?.access_token) return;
    setSavingProfile(true);
    try {
      await fetch(apiUrl("/api/profile"), {
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
        "This will clear ALL local data including grows, favorites, and settings. Continue?"
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

  // Shared input style
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 15,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
    display: "block",
  };

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          color: "#fff",
        }}
      >
        {/* ── Top Bar ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={() => router.push("/garden")}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
              marginRight: 8,
            }}
          >
            ←
          </button>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>
            ⚙️ Settings
          </span>
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
            <SSNotice
              tone="success"
              style={{
                position: "fixed",
                top: 80,
                right: 20,
                zIndex: 999,
              }}
            >
              ✓ Saved
            </SSNotice>
          )}

          {/* ═══ Account / Profile ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <SectionHeader icon="👤" title="Account" />

            {isLoggedIn ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="Your name"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Email</label>
                  <div
                    style={{
                      ...inputStyle,
                      color: "rgba(255,255,255,0.7)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    {email}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    onBlur={saveProfile}
                    placeholder="City, State"
                    style={inputStyle}
                  />
                </div>

                {savingProfile && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    Saving...
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 15,
                    marginBottom: 18,
                    lineHeight: 1.6,
                  }}
                >
                  Sign in to sync your profile, track scans, and manage your
                  membership.
                </div>
                <SSButton
                  onClick={() => setShowAuth(true)}
                  style={{ borderRadius: 12, padding: "14px 32px", fontSize: 15 }}
                >
                  Sign In
                </SSButton>
              </div>
            )}
          </SSCard>

          {/* ═══ Membership ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <SectionHeader icon="🏅" title="Membership" />
            <SSCard
              tone={planTier === "free" ? "warning" : "success"}
              padding={16}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 12,
                boxShadow: "none",
              }}
            >
              <div>
                <SSBadge tone={planTier === "free" ? "gold" : "success"} style={{ color: tierBadgeColor(planTier), fontSize: 13 }}>
                  {tierLabel(planTier)}
                  {planTier !== "free" && " ✓"}
                </SSBadge>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    marginTop: 3,
                  }}
                >
                  {planTier === "free"
                    ? "Scanner + basic features"
                    : planTier === "pro"
                    ? "Unlimited scans + all features"
                    : "Full Garden access + scans"}
                </div>
                {isLoggedIn &&
                  (entitlementsStatus === "loading" ||
                    entitlementsStatus === "idle") && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Checking plan with server…
                  </div>
                )}
              </div>
              {planTier === "free" && (
                <SSButton
                  variant="warning"
                  onClick={() => setShowPaywall(true)}
                  style={{ padding: "8px 18px", borderRadius: 99, fontSize: 13 }}
                >
                  Upgrade
                </SSButton>
              )}
            </SSCard>

            {scansRow && (
              <SSCard
                padding="14px 16px"
                style={{
                  marginTop: 12,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      display: "block",
                    }}
                  >
                    {scansRow.label}
                  </span>
                  {scansRow.hint && (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 12,
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      {scansRow.hint}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    color: scansValueColor,
                    fontSize: 18,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {scansRow.value}
                </span>
              </SSCard>
            )}
          </SSCard>

          {/* ═══ Scanner ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <SectionHeader icon="📷" title="Scanner" />
            <SettingRow
              label="Scan Quality"
              description="Higher quality uses more data"
            >
              <div style={{ display: "flex", gap: 6 }}>
                {(["standard", "high"] as const).map((q) => (
                  <SSButton
                    key={q}
                    variant={prefs.scanQuality === q ? "secondary" : "ghost"}
                    onClick={() => updatePrefs({ scanQuality: q })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 99,
                      fontSize: 13,
                      textTransform: "capitalize",
                      background:
                        prefs.scanQuality === q
                          ? "rgba(206,147,216,0.25)"
                          : "rgba(255,255,255,0.08)",
                      color:
                        prefs.scanQuality === q
                          ? "#CE93D8"
                          : "rgba(255,255,255,0.7)",
                      border: `1px solid ${
                        prefs.scanQuality === q
                          ? "rgba(206,147,216,0.5)"
                          : "rgba(255,255,255,0.15)"
                      }`,
                    }}
                  >
                    {q}
                  </SSButton>
                ))}
              </div>
            </SettingRow>
          </SSCard>

          {/* ═══ Notifications ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
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
          </SSCard>

          {/* ═══ Preferences ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <SectionHeader icon="🎨" title="Preferences" />
            <SettingRow label="Units">
              <div style={{ display: "flex", gap: 6 }}>
                {(["imperial", "metric"] as const).map((u) => (
                  <SSButton
                    key={u}
                    variant={prefs.units === u ? "secondary" : "ghost"}
                    onClick={() => updatePrefs({ units: u })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 99,
                      fontSize: 13,
                      background:
                        prefs.units === u
                          ? "rgba(100,181,246,0.25)"
                          : "rgba(255,255,255,0.08)",
                      color:
                        prefs.units === u
                          ? "#64B5F6"
                          : "rgba(255,255,255,0.7)",
                      border: `1px solid ${
                        prefs.units === u
                          ? "rgba(100,181,246,0.5)"
                          : "rgba(255,255,255,0.15)"
                      }`,
                    }}
                  >
                    {u === "imperial" ? "°F / in" : "°C / cm"}
                  </SSButton>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="Theme">
              <div style={{ display: "flex", gap: 6 }}>
                {(["dark", "auto"] as const).map((t) => (
                  <SSButton
                    key={t}
                    variant={prefs.theme === t ? "secondary" : "ghost"}
                    onClick={() => updatePrefs({ theme: t })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 99,
                      fontSize: 13,
                      textTransform: "capitalize",
                      background:
                        prefs.theme === t
                          ? "rgba(100,181,246,0.25)"
                          : "rgba(255,255,255,0.08)",
                      color:
                        prefs.theme === t
                          ? "#64B5F6"
                          : "rgba(255,255,255,0.7)",
                      border: `1px solid ${
                        prefs.theme === t
                          ? "rgba(100,181,246,0.5)"
                          : "rgba(255,255,255,0.15)"
                      }`,
                    }}
                  >
                    {t}
                  </SSButton>
                ))}
              </div>
            </SettingRow>
          </SSCard>

          {/* ═══ Data & Storage ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <SectionHeader icon="💾" title="Data & Storage" />
            <SettingRow label="Local Storage Used">
              <span
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {loaded ? getStorageSize() : "..."}
              </span>
            </SettingRow>
            <div style={{ marginTop: 14 }}>
              <SSButton
                variant="danger"
                onClick={handleClearData}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                🗑️ Clear All Local Data
              </SSButton>
            </div>
          </SSCard>

          {/* ═══ Sign Out (only if logged in) ═══ */}
          {isLoggedIn && (
            <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
              <SSButton
                variant="danger"
                fullWidth
                onClick={handleSignOut}
                style={{
                  padding: "16px 0",
                  borderRadius: 12,
                  fontSize: 16,
                }}
              >
                Sign Out
              </SSButton>
            </SSCard>
          )}

          {/* ═══ About ═══ */}
          <SSCard padding={20} style={{ marginBottom: 16, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <SectionHeader icon="ℹ️" title="About" />
            <SettingRow label="Version">
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600 }}>
                1.0.0-beta
              </span>
            </SettingRow>
            <SettingRow label="Build">
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600 }}>
                Pre-Launch
              </span>
            </SettingRow>
          </SSCard>

          {/* ═══ Feedback ═══ */}
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <FeedbackForm />
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
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
