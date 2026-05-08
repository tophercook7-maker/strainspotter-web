"use client";

// components/GlassPanel.tsx
//
// Frosted-glass surface for text-heavy regions on dark backgrounds.
// Apple-style backdrop blur + soft white tint + subtle 1px border.
// Use this anywhere you'd otherwise have semi-transparent text floating
// directly on the page background — gives the words a "cushion" so they
// don't visually fight whatever is behind them.
//
// Three intensities:
//   "soft"  — barely-there, for inline text labels (4% tint)
//   "card"  — default, for content blocks (8% tint, the workhorse)
//   "deep"  — heavier, for modal headers and hero content (14% tint)
//
// Browsers without backdrop-filter support degrade to a flat semi-
// transparent fill; still readable, just not blurred.

import type { CSSProperties, ReactNode } from "react";

type Intensity = "soft" | "card" | "deep";

interface Props {
  children: ReactNode;
  intensity?: Intensity;
  /** Inline padding override. Default 16px. */
  padding?: number | string;
  /** Inline border-radius override. Default 14px. */
  radius?: number;
  /** Extra inline styles merged on top. */
  style?: CSSProperties;
  /** className passthrough. */
  className?: string;
  /** Make it a button? Adds cursor + onClick. */
  onClick?: () => void;
}

const TINT: Record<Intensity, { bg: string; border: string; shadow: string }> = {
  soft: {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    shadow: "0 1px 2px rgba(0,0,0,0.18)",
  },
  card: {
    bg: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.14)",
    shadow: "0 4px 16px rgba(0,0,0,0.32)",
  },
  deep: {
    bg: "rgba(255,255,255,0.14)",
    border: "rgba(255,255,255,0.22)",
    shadow: "0 6px 24px rgba(0,0,0,0.42)",
  },
};

export default function GlassPanel({
  children,
  intensity = "card",
  padding = 16,
  radius = 14,
  style,
  className,
  onClick,
}: Props) {
  const tint = TINT[intensity];

  const baseStyle: CSSProperties = {
    background: tint.bg,
    border: `1px solid ${tint.border}`,
    borderRadius: radius,
    padding,
    boxShadow: tint.shadow,

    // The frosted-glass effect itself. backdropFilter is the Apple-style
    // blur of whatever is behind the panel; -webkit prefix for Safari /
    // iOS WebView coverage.
    backdropFilter: "blur(18px) saturate(1.4)",
    WebkitBackdropFilter: "blur(18px) saturate(1.4)",

    // Make sure the panel stacks above siblings without forcing a new
    // layer for everything inside.
    position: "relative",
    color: "#fff",
  };

  return (
    <div
      className={className}
      onClick={onClick}
      style={{ ...baseStyle, ...style, cursor: onClick ? "pointer" : undefined }}
    >
      {children}
    </div>
  );
}
