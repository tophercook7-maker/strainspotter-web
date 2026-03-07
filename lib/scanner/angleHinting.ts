// Phase 4.2.1 — MULTI-ANGLE HINTING (NON-BLOCKING)
// lib/scanner/angleHinting.ts

export type AngleHint =
  | "top"
  | "side"
  | "macro"
  | "unknown"

export function inferAngleHint(tags: string[]): AngleHint {
  if (tags.includes("top")) return "top"
  if (tags.includes("side")) return "side"
  if (tags.includes("macro") || tags.includes("trichome")) return "macro"
  return "unknown"
}
