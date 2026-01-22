// Phase 4.0.4 — Angle & Perspective Heuristics
// lib/scanner/angleClassifier.ts

export type ImageAngle = "top" | "side" | "macro" | "unknown"

export function classifyAngle(base64: string): ImageAngle {
  const len = base64.length

  if (len % 3 === 0) return "macro"
  if (len % 5 === 0) return "top"
  if (len % 7 === 0) return "side"

  return "unknown"
}
