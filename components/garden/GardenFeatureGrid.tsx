"use client";

import React from "react";
import Link from "next/link";

export type GardenFeatureId =
  | "scanner"
  | "strain-browser"
  | "grow-doctor"
  | "grow-coach"
  | "grow-log"
  | "seed-finder"
  | "dispensary-finder"
  | "grower-directory"
  | "inventory"
  | "coa-reader"
  | "calendar"
  | "pests"
  | "effects"
  | "flavors"
  | "spot-ai"
  | "community"
  | "news"
  | "achievements"
  | "settings"
  | "dispensary-dashboard";

type GardenFeature = {
  id: GardenFeatureId;
  label: string;
  description: string;
  href: string | null; // null = coming soon / locked
  badge?: "NEW" | "PRO" | "COMING_SOON";
  tone?: "primary" | "secondary" | "warning";
};

const features: GardenFeature[] = [
  {
    id: "scanner",
    label: "Scanner",
    description: "Full AI strain + plant doctor scans for members.",
    href: "/scanner-gate", // Scanner is outside Garden
    badge: "NEW",
    tone: "primary",
  },
  {
    id: "strain-browser",
    label: "Strain Library",
    description: "Search 35,000+ strains with rich AI profiles.",
    href: "/garden/strain-library",
    tone: "primary",
  },
  {
    id: "grow-doctor",
    label: "Plant Health / Grow Doctor",
    description: "Upload plant photos and get instant health diagnosis.",
    href: "/garden/grow-doctor",
    badge: "NEW",
    tone: "secondary",
  },
  {
    id: "grow-coach",
    label: "Grow Coach AI",
    description: "Chat with an AI coach trained on real grow logs.",
    href: "/garden/grow-coach",
    tone: "secondary",
  },
  {
    id: "grow-log",
    label: "My Grows & Logbook",
    description: "Track every plant, feeding, and harvest in one place.",
    href: "/garden/logbook",
  },
  {
    id: "seed-finder",
    label: "Seed Finder",
    description: "Find the right genetics from trusted vendors.",
    href: "/garden/seed-finder",
  },
  {
    id: "dispensary-finder",
    label: "Dispensary Finder",
    description: "Locate nearby shops and match them to your strains.",
    href: "/garden/dispensary-finder",
  },
  {
    id: "grower-directory",
    label: "Grower Directory",
    description: "Discover verified growers and pro partners.",
    href: "/garden/grower-dashboard",
    badge: "PRO",
  },
  {
    id: "inventory",
    label: "Inventory (Pro)",
    description: "Track batches, units, and strain stock for your brand.",
    href: "/garden/inventory",
    badge: "PRO",
  },
  {
    id: "coa-reader",
    label: "COA Reader",
    description: "Upload and parse Certificate of Analysis documents.",
    href: "/garden/coa-reader",
    badge: "NEW",
    tone: "secondary",
  },
  {
    id: "calendar",
    label: "Grow Calendar",
    description: "Plan your grow cycles, feedings, and harvest dates.",
    href: "/garden/calendar",
    tone: "secondary",
  },
  {
    id: "pests",
    label: "Pest & Disease Guide",
    description: "Identify and treat common cannabis pests and diseases.",
    href: "/garden/pests",
    tone: "secondary",
  },
  {
    id: "effects",
    label: "Effects Matrix",
    description: "Explore strain effects and find your perfect match.",
    href: "/garden/effects",
  },
  {
    id: "flavors",
    label: "Flavor Wheel",
    description: "Discover terpene profiles and flavor combinations.",
    href: "/garden/flavors",
  },
  {
    id: "spot-ai",
    label: "Chat with Spot AI",
    description: "Ask anything about strains, grows, and products.",
    href: "/spot",
  },
  {
    id: "community",
    label: "Community & Groups",
    description: "Join private channels and grower / dispensary groups.",
    href: "/community",
    badge: "COMING_SOON",
  },
  {
    id: "news",
    label: "Cannabis News & Education",
    description: "Stay ahead with industry news and grow guides.",
    href: "/news",
  },
  {
    id: "achievements",
    label: "Achievements & Badges",
    description: "Unlock milestones as you scan, grow, and explore.",
    href: "/profile/achievements",
  },
  {
    id: "settings",
    label: "Account, Billing & Devices",
    description: "Manage membership, devices, and notifications.",
    href: "/settings",
  },
  {
    id: "dispensary-dashboard",
    label: "Dispensary Dashboard",
    description: "Manage your dispensary inventory and sales.",
    href: "/garden/dispensary-dashboard",
    badge: "PRO",
  },
];

export type GardenFeatureGridProps = {
  onTileClick?: (href: string | null, feature?: GardenFeature) => void;
};

const badgeStyles: Record<
  NonNullable<GardenFeature["badge"]>,
  string
> = {
  NEW: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/70",
  PRO: "bg-amber-500/15 text-amber-200 border border-amber-400/70",
  COMING_SOON:
    "bg-slate-500/10 text-slate-200 border border-slate-500/60",
};

const toneBorder: Record<
  NonNullable<GardenFeature["tone"]>,
  string
> = {
  primary: "border-emerald-400/60",
  secondary: "border-emerald-300/50",
  warning: "border-amber-300/60",
};

const GardenFeatureGrid: React.FC<GardenFeatureGridProps> = ({
  onTileClick,
}) => {
  return (
    <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => {
        const card = (
          <div
            key={f.id}
            className={[
              "group relative overflow-hidden rounded-2xl border bg-black/55",
              "backdrop-blur-xl p-4 sm:p-5 cursor-pointer",
              "transition-transform duration-200 ease-out hover:-translate-y-1",
              "hover:shadow-[0_0_40px_rgba(16,255,180,0.4)]",
              f.tone ? toneBorder[f.tone] : "border-emerald-300/30",
            ].join(" ")}
            onClick={() => onTileClick && onTileClick(f.href, f)}
          >
            {/* Glow */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-300/10" />
            </div>

            {/* Header row */}
            <div className="relative mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                {f.label}
              </h2>
              {f.badge && (
                <span
                  className={[
                    "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide",
                    "backdrop-blur-md",
                    badgeStyles[f.badge],
                  ].join(" ")}
                >
                  {f.badge === "COMING_SOON" ? "Coming soon" : f.badge}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="relative text-xs sm:text-sm text-emerald-50/80 mb-4">
              {f.description}
            </p>

            {/* Footer / CTA hint */}
            <div className="relative flex items-center justify-between text-[11px] sm:text-xs text-emerald-100/70">
              {f.href ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,255,180,0.9)]" />
                    Tap to enter
                  </span>
                  <span className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    Open
                    <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </span>
                </>
              ) : (
                <span className="italic text-emerald-100/60">
                  Coming online soon.
                </span>
              )}
            </div>
          </div>
        );

        if (f.href) {
          return (
            <Link key={f.id} href={f.href} className="contents">
              {card}
            </Link>
          );
        }

        // no href = non-clickable (coming soon)
        return card;
      })}
    </div>
  );
};

export default GardenFeatureGrid;

