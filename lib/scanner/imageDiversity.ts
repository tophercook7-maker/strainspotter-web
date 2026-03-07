// lib/scanner/imageDiversity.ts
// NEW — Phase 4.0.1: Detect near-duplicate images and enforce distinction

export type ImageDiversityResult = {
  isValid: boolean
  similarityScores: number[]
  reason?: string
}

export function evaluateImageDiversity(
  imageHashes: string[],
  threshold = 0.92
): ImageDiversityResult {
  if (imageHashes.length < 2) {
    return { isValid: true, similarityScores: [] }
  }

  const scores: number[] = []

  for (let i = 0; i < imageHashes.length; i++) {
    for (let j = i + 1; j < imageHashes.length; j++) {
      const score = similarity(imageHashes[i], imageHashes[j])
      scores.push(score)
      if (score >= threshold) {
        return {
          isValid: false,
          similarityScores: scores,
          reason: "Images are too similar. Use different angles or distances.",
        }
      }
    }
  }

  return { isValid: true, similarityScores: scores }
}

function similarity(a: string, b: string): number {
  let matches = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) matches++
  }
  return matches / len
}

// Phase 4.0.2 — SOFT diversity handling (weight, don't fail)
export type ImageDiversityScore = {
  pair: [number, number]
  similarity: number
}

export type ImageDiversityAssessment = {
  overallScore: number
  penalties: Record<number, number>
}

export function assessImageDiversity(
  imageHashes: string[],
  hardThreshold = 0.95,
  softThreshold = 0.85
): ImageDiversityAssessment {
  const penalties: Record<number, number> = {}
  let comparisons = 0
  let cumulative = 0

  for (let i = 0; i < imageHashes.length; i++) {
    penalties[i] = 1
    for (let j = i + 1; j < imageHashes.length; j++) {
      const score = similarity(imageHashes[i], imageHashes[j])
      cumulative += score
      comparisons++

      if (score >= hardThreshold) {
        penalties[j] *= 0.4
      } else if (score >= softThreshold) {
        penalties[j] *= 0.7
      }
    }
  }

  return {
    overallScore: comparisons ? cumulative / comparisons : 0,
    penalties,
  }
}

// Phase 4.0.7 — image angle & feature diversity scoring
export type ImageDiversityMetrics = {
  angleVariance: number
  featureVariance: number
  overallScore: number
}

export function calculateImageDiversity(images: {
  angleHint?: "top" | "side" | "macro" | "unknown"
  features: string[]
}[]): ImageDiversityMetrics {
  const uniqueAngles = new Set(images.map(i => i.angleHint ?? "unknown")).size
  const angleVariance = Math.min(1, uniqueAngles / images.length)

  const allFeatures = images.flatMap(i => i.features)
  const uniqueFeatures = new Set(allFeatures).size
  const featureVariance = Math.min(1, uniqueFeatures / Math.max(allFeatures.length, 1))

  const overallScore = Number(
    (angleVariance * 0.6 + featureVariance * 0.4).toFixed(2)
  )

  return {
    angleVariance,
    featureVariance,
    overallScore,
  }
}
