// Phase 4.0.1 — IMAGE DISTINCTIVENESS GUARD
// lib/scanner/imageDistinctiveness.ts

export function areImagesDistinctEnough(
  imageFingerprints: number[][],
  threshold = 0.92
): boolean {
  if (imageFingerprints.length < 2) return true

  for (let i = 0; i < imageFingerprints.length; i++) {
    for (let j = i + 1; j < imageFingerprints.length; j++) {
      const similarity = cosineSimilarity(
        imageFingerprints[i],
        imageFingerprints[j]
      )
      if (similarity > threshold) return false
    }
  }
  return true
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return dot / (magA * magB)
}

// Phase 4.0.3 — detect near-duplicate images safely
export function computeDistinctivenessScore(a: number[], b: number[]): number {
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff += Math.abs(a[i] - b[i])
  }
  return diff / a.length
}

export function tagDuplicateImages(results: any[]): any[] {
  const threshold = 0.08 // tolerant — NOT strict

  return results.map((r, i) => {
    let similarityPenalty = 0

    results.forEach((other, j) => {
      if (i !== j) {
        const score = computeDistinctivenessScore(
          r.visualSignature,
          other.visualSignature
        )
        if (score < threshold) similarityPenalty += 0.15
      }
    })

    return {
      ...r,
      weight: Math.max(0.6, r.weight - similarityPenalty),
    }
  })
}
