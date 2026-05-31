import type { CSSProperties, ReactNode } from "react";

type SSSectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
};

export default function SSSectionHeader({
  eyebrow,
  title,
  description,
  actions,
  style,
}: SSSectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow ? (
          <div
            style={{
              color: "#9fffd0",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h2 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
          {title}
        </h2>
        {description ? (
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.62)",
              fontSize: 13,
              lineHeight: 1.55,
              maxWidth: 720,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
