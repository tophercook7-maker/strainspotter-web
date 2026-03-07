// lib/scanner/imageDiversityHints.ts
// Phase 4.0.5 — generate user-facing guidance when images lack distinction

export function generateDiversityHint(diversityScore: number): string | null {
  if (diversityScore >= 0.8) return null

  if (diversityScore >= 0.65) {
    return "Photos appear similar. Try one close-up of the bud and one wider plant view for higher accuracy."
  }

  return "Images seem very similar. Best results come from multiple angles (top, side, close-up of trichomes)."
}
