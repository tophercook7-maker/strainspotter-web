import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type SSCardProps = {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "info" | "danger";
  padding?: number | string;
  style?: CSSProperties;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

const toneStyles: Record<NonNullable<SSCardProps["tone"]>, CSSProperties> = {
  default: {
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  success: {
    background: "rgba(76,175,80,0.08)",
    border: "1px solid rgba(76,175,80,0.28)",
  },
  warning: {
    background: "rgba(255,183,77,0.08)",
    border: "1px solid rgba(255,183,77,0.28)",
  },
  info: {
    background: "rgba(79,195,247,0.08)",
    border: "1px solid rgba(79,195,247,0.28)",
  },
  danger: {
    background: "rgba(239,83,80,0.08)",
    border: "1px solid rgba(239,83,80,0.28)",
  },
};

export default function SSCard({
  children,
  tone = "default",
  padding = 16,
  style,
  className,
  ...props
}: SSCardProps) {
  return (
    <div
      className={className}
      {...props}
      style={{
        borderRadius: 16,
        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
        padding,
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
