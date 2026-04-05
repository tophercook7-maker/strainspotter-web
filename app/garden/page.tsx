"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
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
    return localStorage.getItem("ss_tier");
  } catch {
    return null;
  }
}

/* ─── Feature data ─── */
const FEATURES = [
  { href: "/garden/strains", icon: "🔬", label: "Strains", desc: "Browse strain database" },
  { href: "/garden/ecosystem", icon: "🧬", label: "Ecosystem", desc: "Explore genetics & lineage" },
  { href: "/garden/grow-coach", icon: "🌱", label: "Grow Coach", desc: "Track & improve your grows" },
  { href: "/garden/dispensaries", icon: "📍", label: "Dispensaries", desc: "Find nearby shops" },
  { href: "/garden/seed-vendors", icon: "🌰", label: "Seed Vendors", desc: "Trusted seed sources" },
  { href: "/garden/favorites", icon: "❤️", label: "Favorites", desc: "Your saved strains" },
];

const QUICK_LINKS = [
  { href: "/garden/history", icon: "📋", label: "Scan History" },
  { href: "/garden/settings", icon: "⚙️", label: "Settings" },
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
  return "rgba(255,255,255,0.35)";
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
          className="sticky top-0 z-50 w-full flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur-md"
        >
          {/* Back → Scanner */}
          <button
            onClick={() => router.push("/garden/scanner")}
            className="flex items-center gap-1.5 text-white/70 hover:text-white transition"
            aria-label="Back to Scanner"
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Scanner</span>
          </button>

          <h1 className="text-white text-lg font-semibold tracking-tight">
            🌿 The Garden
          </h1>

          {/* Login / Profile */}
          {isLoggedIn ? (
            <button
              onClick={() => router.push("/garden/settings")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: tierColor(tier),
                  background: `${tierColor(tier)}18`,
                  border: `1px solid ${tierColor(tier)}44`,
                  borderRadius: 6,
                  padding: "3px 8px",
                }}
              >
                {tierLabel(tier)}
              </span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #43A047, #2E7D32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {(displayName || "?")[0].toUpperCase()}
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{
                background: "linear-gradient(135deg, #43A047, #2E7D32)",
                border: "none",
                borderRadius: 10,
                padding: "7px 14px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign In
            </button>
          )}
        </div>

        <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-8">
          {/* Scanner Shortcut — prominent */}
          <button
            onClick={() => router.push("/garden/scanner")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "18px 20px",
              background: "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(56,142,60,0.08))",
              border: "1px solid rgba(76,175,80,0.3)",
              borderRadius: 16,
              cursor: "pointer",
              color: "inherit",
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: 32,
                width: 52,
                height: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(76,175,80,0.2)",
                borderRadius: 14,
              }}
            >
              📸
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                Scanner
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                AI strain identification — snap &amp; analyze
              </div>
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 18,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              →
            </span>
          </button>

          {/* Feature Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {FEATURES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "16px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <span
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    lineHeight: 1.3,
                  }}
                >
                  {item.desc}
                </span>
              </Link>
            ))}
          </div>

          {/* Quick Links */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              paddingTop: 8,
              paddingBottom: 24,
            }}
          >
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 13,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {link.icon} {link.label}
              </Link>
            ))}
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
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
