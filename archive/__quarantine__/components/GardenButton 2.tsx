"use client";

import Link from "next/link";

export default function GardenButton({
  href,
  label,
  accent = false,
}: {
  href: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        style={{
          height: "64px",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          fontSize: "16px",
          fontWeight: 500,
          cursor: "pointer",
          background: accent
            ? "rgba(0,40,0,0.55)"
            : "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(18px)",
          color: "#E8FFE8",
          boxShadow: accent
            ? "0 0 18px rgba(0,255,0,0.25)"
            : "none",
        }}
      >
        {label}
      </div>
    </Link>
  );
}

