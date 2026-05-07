"use client";

// app/garden/_components/ZoneNav.tsx
//
// Sub-navigation for the "consolidated" garden zones (May 2026 5-tab plan).
//
// Each of the 5 primary garden destinations absorbs several legacy routes.
// This component renders a horizontal scrolling pill row inside any of those
// pages so users can hop between siblings without going back to the landing.
//
//   <ZoneNav zone="library" />   on strains, ecosystem, terpenes, compare, favorites
//   <ZoneNav zone="nearby"  />   on dispensaries, seed-vendors
//   <ZoneNav zone="scan"    />   on scanner, history
//   <ZoneNav zone="grow"    />   on grow-coach, plants, grow-groups, grow-log
//
// The active route is detected via usePathname; matching tabs render selected.

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ZoneKey = "scan" | "grow" | "library" | "nearby" | "journal";

type Tab = { href: string; label: string; icon: string };

const ZONES: Record<ZoneKey, Tab[]> = {
  scan: [
    { href: "/garden/scanner", label: "Scan",     icon: "📷" },
    { href: "/garden/history", label: "History",  icon: "📋" },
  ],
  grow: [
    { href: "/garden/grow-coach",   label: "Doctor",  icon: "🩺" },
    { href: "/garden/plants",       label: "Plants",  icon: "🌱" },
    { href: "/garden/grow-groups",  label: "Groups",  icon: "🪴" },
    { href: "/garden/grow-log",     label: "Log",     icon: "📔" },
  ],
  library: [
    { href: "/garden/strains",   label: "Strains",   icon: "🔬" },
    { href: "/garden/ecosystem", label: "Discover",  icon: "🧬" },
    { href: "/garden/favorites", label: "Favorites", icon: "❤️" },
  ],
  nearby: [
    { href: "/garden/dispensaries", label: "Dispensaries", icon: "📍" },
    { href: "/garden/seed-vendors", label: "Seeds",        icon: "🌰" },
  ],
  journal: [
    { href: "/garden/journal", label: "Journal", icon: "📓" },
  ],
};

export default function ZoneNav({
  zone,
  /** Optional: title shown above the row, e.g. "Library" */
  zoneLabel,
}: {
  zone: ZoneKey;
  zoneLabel?: string;
}) {
  const pathname = usePathname();
  const tabs = ZONES[zone];
  if (!tabs || tabs.length <= 1) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      {zoneLabel && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: 8,
          }}
        >
          {zoneLabel}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
          // hide scrollbar track on webkit; row stays swipeable
          scrollbarWidth: "none" as const,
        }}
      >
        {tabs.map((t) => {
          const active = pathname === t.href || pathname?.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                background: active
                  ? "rgba(76,175,80,0.18)"
                  : "rgba(255,255,255,0.04)",
                border: active
                  ? "1px solid rgba(76,175,80,0.45)"
                  : "1px solid rgba(255,255,255,0.10)",
                color: active ? "#81C784" : "rgba(255,255,255,0.75)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
