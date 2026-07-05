import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type SSButtonVariant = "primary" | "secondary" | "success" | "info" | "warning" | "danger" | "ghost";

type SSButtonProps = {
  children: ReactNode;
  variant?: SSButtonVariant;
  fullWidth?: boolean;
  style?: CSSProperties;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variants: Record<SSButtonVariant, CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #34d399, #059669)",
    border: "1px solid rgba(110,231,183,0.35)",
    color: "#fff",
  },
  secondary: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.9)",
  },
  success: {
    background: "rgba(52,211,153,0.16)",
    border: "1px solid rgba(159,255,208,0.42)",
    color: "#9fffd0",
  },
  info: {
    background: "rgba(79,195,247,0.12)",
    border: "1px solid rgba(129,212,250,0.38)",
    color: "#9fd7ff",
  },
  warning: {
    background: "rgba(255,183,77,0.1)",
    border: "1px solid rgba(255,210,138,0.36)",
    color: "#ffd28a",
  },
  danger: {
    background: "rgba(239,83,80,0.12)",
    border: "1px solid rgba(239,83,80,0.34)",
    color: "#ffb4b2",
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
    color: "rgba(255,255,255,0.42)",
  },
};

export default function SSButton({
  children,
  variant = "primary",
  fullWidth,
  style,
  type = "button",
  disabled,
  ...props
}: SSButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        width: fullWidth ? "100%" : undefined,
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 14,
        fontWeight: 800,
        padding: "12px 18px",
        opacity: disabled ? 0.58 : 1,
        transition: "transform 0.15s ease, opacity 0.15s ease",
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
