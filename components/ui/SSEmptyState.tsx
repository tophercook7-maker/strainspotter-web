import type { CSSProperties, ReactNode } from "react";
import SSCard from "./SSCard";

type SSEmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
};

export default function SSEmptyState({
  icon,
  title,
  description,
  action,
  style,
}: SSEmptyStateProps) {
  return (
    <SSCard padding="32px 22px" style={{ textAlign: "center", ...style }}>
      {icon ? <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div> : null}
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>{title}</div>
      {description ? (
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 14,
            lineHeight: 1.55,
            margin: "8px auto 0",
            maxWidth: 420,
          }}
        >
          {description}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </SSCard>
  );
}
