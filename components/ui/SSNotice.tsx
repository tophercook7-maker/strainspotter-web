import type { CSSProperties, ReactNode } from "react";
import SSCard from "./SSCard";

type SSNoticeTone = "default" | "success" | "warning" | "info" | "danger";

type SSNoticeProps = {
  title?: ReactNode;
  children: ReactNode;
  tone?: SSNoticeTone;
  style?: CSSProperties;
};

const titleColors: Record<SSNoticeTone, string> = {
  default: "rgba(255,255,255,0.72)",
  success: "#9fffd0",
  warning: "#ffd28a",
  info: "#9fd7ff",
  danger: "#ffb4b2",
};

export default function SSNotice({ title, children, tone = "default", style }: SSNoticeProps) {
  return (
    <SSCard tone={tone} padding="12px 14px" style={{ ...style }}>
      {title ? (
        <div
          style={{
            color: titleColors[tone],
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.55 }}>
        {children}
      </div>
    </SSCard>
  );
}
