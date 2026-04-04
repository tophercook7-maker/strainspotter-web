"use client";

import { useState, useEffect } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import Switch from "@mui/material/Switch";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PaletteIcon from "@mui/icons-material/Palette";
import StorageIcon from "@mui/icons-material/Storage";
import InfoIcon from "@mui/icons-material/Info";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import BugReportIcon from "@mui/icons-material/BugReport";
import ScanPaywall from "@/components/ScanPaywall";

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
  notifications: {
    growReminders: true,
    scanComplete: true,
    weeklyDigest: false,
  },
  theme: "dark",
  scanQuality: "standard",
};

// ─── localStorage ────────────────────────────────────────────────────────────
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
function glassCard(extra: Record<string, any> = {}) {
  return {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      {icon}
      <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>
        {title}
      </Typography>
    </Box>
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 1.5,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Box>
        <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: 600 }}>
          {label}
        </Typography>
        {description && (
          <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 12, mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
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
    if (
      confirm(
        "⚠️ This will clear ALL local data including grows, favorites, and settings. This cannot be undone. Continue?"
      )
    ) {
      localStorage.removeItem("strainspotter_grows");
      localStorage.removeItem("strainspotter_favorites");
      localStorage.removeItem(SETTINGS_KEY);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  // Calculate local storage usage
  const getStorageSize = () => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith("strainspotter")) {
          total += (localStorage.getItem(key) || "").length * 2; // UTF-16 chars = 2 bytes
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
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <SettingsIcon sx={{ fontSize: 28, color: "rgba(255,255,255,0.7)" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Settings
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Customize your StrainSpotter experience. Manage your profile, notification preferences,
              and app settings.
            </Typography>
          </Box>

          {/* Save indicator */}
          {saved && (
            <Box
              sx={{
                position: "fixed",
                top: 80,
                right: 20,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: "rgba(76,175,80,0.9)",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                zIndex: 999,
                animation: "fadeIn 0.2s ease",
              }}
            >
              ✓ Saved
            </Box>
          )}

          {/* Profile */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<PersonIcon sx={{ fontSize: 16, color: "#64B5F6" }} />}
              title="Profile"
            />
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, mb: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>
                Display Name
              </Typography>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => update({ displayName: e.target.value })}
                placeholder="Your name"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </Box>
            <Box>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, mb: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>
                Email
              </Typography>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </Box>
          </Box>

          {/* Membership */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<WorkspacePremiumIcon sx={{ fontSize: 16, color: "#FFD54F" }} />}
              title="Membership"
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                borderRadius: 2,
                background: "rgba(255,213,79,0.08)",
                border: "1px solid rgba(255,213,79,0.2)",
              }}
            >
              <Box>
                <Typography sx={{ color: "#FFD54F", fontSize: 14, fontWeight: 700 }}>
                  Free Tier
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  Scanner + basic features
                </Typography>
              </Box>
              <ButtonBase
                onClick={() => setShowPaywall(true)}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 99,
                  background: "rgba(255,213,79,0.15)",
                  color: "#FFD54F",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid rgba(255,213,79,0.3)",
                }}
              >
                Upgrade
              </ButtonBase>
            </Box>
          </Box>

          {/* Scanner */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<CameraAltIcon sx={{ fontSize: 16, color: "#CE93D8" }} />}
              title="Scanner"
            />
            <SettingRow label="Scan Quality" description="Higher quality uses more data">
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {(["standard", "high"] as const).map((q) => (
                  <ButtonBase
                    key={q}
                    onClick={() => update({ scanQuality: q })}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      background: settings.scanQuality === q ? "rgba(206,147,216,0.2)" : "rgba(255,255,255,0.05)",
                      color: settings.scanQuality === q ? "#CE93D8" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${settings.scanQuality === q ? "rgba(206,147,216,0.4)" : "rgba(255,255,255,0.1)"}`,
                      textTransform: "capitalize",
                    }}
                  >
                    {q}
                  </ButtonBase>
                ))}
              </Box>
            </SettingRow>
          </Box>

          {/* Notifications */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<NotificationsIcon sx={{ fontSize: 16, color: "#FFB74D" }} />}
              title="Notifications"
            />
            <SettingRow label="Grow Reminders" description="Daily reminders to log your grow">
              <Switch
                checked={settings.notifications.growReminders}
                onChange={(e) => updateNotification("growReminders", e.target.checked)}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#66BB6A" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#66BB6A" } }}
              />
            </SettingRow>
            <SettingRow label="Scan Complete" description="Notify when scan results are ready">
              <Switch
                checked={settings.notifications.scanComplete}
                onChange={(e) => updateNotification("scanComplete", e.target.checked)}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#66BB6A" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#66BB6A" } }}
              />
            </SettingRow>
            <SettingRow label="Weekly Digest" description="Weekly summary of your grow progress">
              <Switch
                checked={settings.notifications.weeklyDigest}
                onChange={(e) => updateNotification("weeklyDigest", e.target.checked)}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#66BB6A" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#66BB6A" } }}
              />
            </SettingRow>
          </Box>

          {/* Preferences */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<PaletteIcon sx={{ fontSize: 16, color: "#64B5F6" }} />}
              title="Preferences"
            />
            <SettingRow label="Units">
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {(["imperial", "metric"] as const).map((u) => (
                  <ButtonBase
                    key={u}
                    onClick={() => update({ units: u })}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      background: settings.units === u ? "rgba(100,181,246,0.2)" : "rgba(255,255,255,0.05)",
                      color: settings.units === u ? "#64B5F6" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${settings.units === u ? "rgba(100,181,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                      textTransform: "capitalize",
                    }}
                  >
                    {u === "imperial" ? "°F / in" : "°C / cm"}
                  </ButtonBase>
                ))}
              </Box>
            </SettingRow>
            <SettingRow label="Theme">
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {(["dark", "auto"] as const).map((t) => (
                  <ButtonBase
                    key={t}
                    onClick={() => update({ theme: t })}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      background: settings.theme === t ? "rgba(100,181,246,0.2)" : "rgba(255,255,255,0.05)",
                      color: settings.theme === t ? "#64B5F6" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${settings.theme === t ? "rgba(100,181,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </ButtonBase>
                ))}
              </Box>
            </SettingRow>
          </Box>

          {/* Data & Storage */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<StorageIcon sx={{ fontSize: 16, color: "#90A4AE" }} />}
              title="Data & Storage"
            />
            <SettingRow label="Local Storage Used">
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>
                {loaded ? getStorageSize() : "..."}
              </Typography>
            </SettingRow>
            <Box sx={{ mt: 1.5 }}>
              <ButtonBase
                onClick={handleClearData}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  background: "rgba(244,67,54,0.1)",
                  color: "#EF5350",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  border: "1px solid rgba(244,67,54,0.2)",
                  "&:hover": { background: "rgba(244,67,54,0.2)" },
                }}
              >
                <DeleteForeverIcon sx={{ fontSize: 16 }} /> Clear All Local Data
              </ButtonBase>
            </Box>
          </Box>

          {/* About */}
          <Box sx={{ ...glassCard({ p: 2.5, mb: 2 }) }}>
            <SectionHeader
              icon={<InfoIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }} />}
              title="About"
            />
            <SettingRow label="Version">
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                1.0.0-beta
              </Typography>
            </SettingRow>
            <SettingRow label="Build">
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                Pre-Launch
              </Typography>
            </SettingRow>
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              StrainSpotter • AI-Powered Cannabis Identification
            </Typography>
          </Box>
        </div>
      </main>
      {showPaywall && (
        <ScanPaywall mode="warning" onClose={() => setShowPaywall(false)} />
      )}
    </>
  );
}
