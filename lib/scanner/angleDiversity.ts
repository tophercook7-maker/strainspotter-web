// Phase 4.0.6 — Angle Diversity Scoring
// lib/scanner/angleDiversity.ts

export function computeAngleDiversity(labels: string[]): number {
  const unique = new Set(labels)
  return unique.size / Math.max(labels.length, 1)
}
