"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  getMobileAppHref,
  MOBILE_APP_CTA_LABEL,
} from "@/lib/config/mobileAppDestination";

const baseStyle: CSSProperties = {
  color: "#6ee7b7",
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

export default function MobileAppCtaLink({
  fontSize = 12,
  marginTop = 8,
}: {
  fontSize?: number;
  marginTop?: number;
}) {
  const href = getMobileAppHref();
  const style: CSSProperties = {
    ...baseStyle,
    fontSize,
    display: "inline-block",
    marginTop,
  };
  const label = `${MOBILE_APP_CTA_LABEL} →`;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {label}
    </Link>
  );
}
