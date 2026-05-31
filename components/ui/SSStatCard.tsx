import type { CSSProperties, ReactNode } from "react";
import SSCard from "./SSCard";

type SSStatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "success" | "warning" | "info" | "danger";
  style?: CSSProperties;
};

export default function SSStatCard({
  label,
  value,
  hint,
  tone = "default",
  style,
}: SSStatCardProps) {
  return (
    <SSCard tone={tone} padding={14} style={style}>
      <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: 8, color: "#fff", fontSize: 28, fontWeight: 950, lineHeight: 1 }}>
        {value}
      </div>
      {hint ? (
        <div style={{ marginTop: 8, color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.4 }}>
          {hint}
        </div>
      ) : null}
    </SSCard>
  );
}
