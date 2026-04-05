"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function GardenPage() {
  const router = useRouter();

  return (
    <>
      <div className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-8 space-y-8">
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              🌿 The Garden
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 14,
                marginTop: 6,
              }}
            >
              Everything StrainSpotter
            </p>
          </div>

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
    </>
  );
}
