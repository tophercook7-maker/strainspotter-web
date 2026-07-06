"use client";

/**
 * Global page-enter transition. template.tsx re-mounts on every navigation,
 * so each page fades and rises in. Pure CSS animation — no layout thrash,
 * and prefers-reduced-motion disables it (see globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ss-page-enter">{children}</div>;
}
