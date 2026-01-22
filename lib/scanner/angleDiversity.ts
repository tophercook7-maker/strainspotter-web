// Phase 4.2.2 — ANGLE DIVERSITY SCORING
// lib/scanner/angleDiversity.ts

export function computeAngleDiversity(angles: string[]): number {
  const unique = new Set(angles.filter(a => a !== "unknown"))
  if (unique.size >= 3) return 1.0
  if (unique.size === 2) return 0.9
  if (unique.size === 1) return 0.8
  return 0.7
}
