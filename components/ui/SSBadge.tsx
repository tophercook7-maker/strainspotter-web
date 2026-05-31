import type { CSSProperties, ReactNode } from "react";

type SSBadgeTone = "default" | "success" | "warning" | "info" | "danger" | "gold";

type SSBadgeProps = {
  children: ReactNode;
  tone?: SSBadgeTone;
  style?: CSSProperties;
};

const tones: Record<SSBadgeTone, CSSProperties> = {
  default: {
    color: "rgba(255,255,255,0.72)",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  success: {
    color: "#9fffd0",
    background: "rgba(76,175,80,0.14)",
    border: "1px solid rgba(159,255,208,0.35)",
  },
  warning: {
    color: "#ffd28a",
    background: "rgba(255,183,77,0.12)",
    border: "1px solid rgba(255,210,138,0.35)",
  },
  info: {
    color: "#9fd7ff",
    background: "rgba(79,195,247,0.12)",
    border: "1px solid rgba(129,212,250,0.35)",
  },
  danger: {
    color: "#ffb4b2",
    background: "rgba(239,83,80,0.12)",
    border: "1px solid rgba(239,83,80,0.35)",
  },
  gold: {
    color: "#ffe082",
    background: "rgba(255,215,0,0.12)",
    border: "1px solid rgba(255,215,0,0.32)",
  },
};

export default function SSBadge({ children, tone = "default", style }: SSBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1,
        padding: "6px 10px",
        width: "fit-content",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
