"use client";

import { useState, useEffect } from "react";
import TopNav from "../_components/TopNav";
import ScanPaywall from "@/components/ScanPaywall";
import FeedbackForm from "@/components/FeedbackForm";

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserSettings {
  displayName: string;
  email: string;
  units: "imperial" | "metric";
  notifications: {
    growReminders: boolean;
    scanComplete: boolean;
    weeklyDigest: boolean;
  };
  theme: "dark" | "auto";
  scanQuality: "standard" | "high";
}

const DEFAULT_SETTINGS: UserSettings = {
  displayName: "",
  email: "",
  units: "imperial",
  notifications: { growReminders: true, scanComplete: true, weeklyDigest: false },
  theme: "dark",
  scanQuality: "standard",
};

const SETTINGS_KEY = "strainspotter_settings";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>
        {title}
      </span>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: 600 }}>{label}</div>
        {description && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, padding: 2, cursor: "pointer",
        background: checked ? "rgba(102,187,106,0.6)" : "rgba(255,255,255,0.15)",
        border: "none", position: "relative", transition: "background 0.2s",
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "white",
        transform: checked ? "translateX(20px)" : "translateX(0)",
        transition: "transform 0.2s",
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  const update = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateNotification = (key: keyof UserSettings["notifications"], val: boolean) => {
    update({ notifications: { ...settings.notifications, [key]: val } });
  };

  const handleClearData = () => {
    if (confirm("⚠️ This will clear ALL local data including grows, favorites, and settings. This cannot be undone. Continue?")) {
      localStorage.removeItem("strainspotter_grows");
      localStorage.removeItem("strainspotter_favorites");
      localStorage.removeItem(SETTINGS_KEY);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const getStorageSize = () => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith("strainspotter")) {
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
      <TopNav title="Settings" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <div style={{ ...glass, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>⚙️</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 24 }}>Settings</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Customize your StrainSpotter experience. Manage your profile, notification preferences,
              and app settings.
            </div>
          </div>

          {/* Save indicator */}
          {saved && (
            <div style={{
              position: "fixed", top: 80, right: 20, padding: "8px 16px", borderRadius: 8,
              background: "rgba(76,175,80,0.9)", color: "white", fontSize: 13, fontWeight: 600, zIndex: 999,
            }}>
              ✓ Saved
            </div>
          )}

          {/* Profile */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="👤" title="Profile" />
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                Display Name
              </div>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => update({ displayName: e.target.value })}
                placeholder="Your name"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)",
                  color: "white", fontSize: 14, outline: "none",
                }}
              />
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                Email
              </div>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="you@example.com"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)",
                  color: "white", fontSize: 14, outline: "none",
                }}
              />
            </div>
          </div>

          {/* Membership */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="🏅" title="Membership" />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: 16, borderRadius: 8,
              background: "rgba(255,213,79,0.08)", border: "1px solid rgba(255,213,79,0.2)",
            }}>
              <div>
                <div style={{ color: "#FFD54F", fontSize: 14, fontWeight: 700 }}>Free Tier</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Scanner + basic features</div>
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                style={{
                  padding: "6px 16px", borderRadius: 99,
                  background: "rgba(255,213,79,0.15)", color: "#FFD54F",
                  fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,213,79,0.3)", cursor: "pointer",
                }}
              >
                Upgrade
              </button>
            </div>
          </div>

          {/* Scanner */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="📷" title="Scanner" />
            <SettingRow label="Scan Quality" description="Higher quality uses more data">
              <div style={{ display: "flex", gap: 4 }}>
                {(["standard", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => update({ scanQuality: q })}
                    style={{
                      padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      textTransform: "capitalize",
                      background: settings.scanQuality === q ? "rgba(206,147,216,0.2)" : "rgba(255,255,255,0.05)",
                      color: settings.scanQuality === q ? "#CE93D8" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${settings.scanQuality === q ? "rgba(206,147,216,0.4)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>

          {/* Notifications */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="🔔" title="Notifications" />
            <SettingRow label="Grow Reminders" description="Daily reminders to log your grow">
              <Toggle checked={settings.notifications.growReminders} onChange={(v) => updateNotification("growReminders", v)} />
            </SettingRow>
            <SettingRow label="Scan Complete" description="Notify when scan results are ready">
              <Toggle checked={settings.notifications.scanComplete} onChange={(v) => updateNotification("scanComplete", v)} />
            </SettingRow>
            <SettingRow label="Weekly Digest" description="Weekly summary of your grow progress">
              <Toggle checked={settings.notifications.weeklyDigest} onChange={(v) => updateNotification("weeklyDigest", v)} />
            </SettingRow>
          </div>

          {/* Preferences */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="🎨" title="Preferences" />
            <SettingRow label="Units">
              <div style={{ display: "flex", gap: 4 }}>
                {(["imperial", "metric"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => update({ units: u })}
                    style={{
                      padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: settings.units === u ? "rgba(100,181,246,0.2)" : "rgba(255,255,255,0.05)",
                      color: settings.units === u ? "#64B5F6" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${settings.units === u ? "rgba(100,181,246,0.4)" : "rgba(255,255,255,0.1)"}`,
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
                    onClick={() => update({ theme: t })}
                    style={{
                      padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      textTransform: "capitalize",
                      background: settings.theme === t ? "rgba(100,181,246,0.2)" : "rgba(255,255,255,0.05)",
                      color: settings.theme === t ? "#64B5F6" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${settings.theme === t ? "rgba(100,181,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>

          {/* Data & Storage */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="💾" title="Data & Storage" />
            <SettingRow label="Local Storage Used">
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>
                {loaded ? getStorageSize() : "..."}
              </span>
            </SettingRow>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={handleClearData}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: "rgba(244,67,54,0.1)", color: "#EF5350",
                  fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4,
                  border: "1px solid rgba(244,67,54,0.2)", cursor: "pointer",
                }}
              >
                🗑️ Clear All Local Data
              </button>
            </div>
          </div>

          {/* About */}
          <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
            <SectionHeader icon="ℹ️" title="About" />
            <SettingRow label="Version">
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>1.0.0-beta</span>
            </SettingRow>
            <SettingRow label="Build">
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Pre-Launch</span>
            </SettingRow>
          </div>

          {/* Feedback */}
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <FeedbackForm />
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              StrainSpotter • AI-Powered Cannabis Identification
            </span>
          </div>
        </div>
      </main>
      {showPaywall && (
        <ScanPaywall mode="warning" onClose={() => setShowPaywall(false)} />
      )}
    </>
  );
}
