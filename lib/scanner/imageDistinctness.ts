// Phase 4.0.9 — IMAGE DISTINCTNESS SCORING
// lib/scanner/imageDistinctness.ts

export function calculateImageDistinctness(images: {
  edgeScore: number
  colorVariance: number
  shapeVariance: number
}[]): number {
  if (images.length < 2) return 0

  let total = 0
  let comparisons = 0

  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const delta =
        Math.abs(images[i].edgeScore - images[j].edgeScore) * 0.4 +
        Math.abs(images[i].colorVariance - images[j].colorVariance) * 0.3 +
        Math.abs(images[i].shapeVariance - images[j].shapeVariance) * 0.3

      total += delta
      comparisons++
    }
  }

  return total / comparisons
}

// Phase 4.0.1 — Assess image distinctness from file metadata
// Early check to block scans if images lack variance
export function assessImageDistinctness(imageSeeds: Array<{ name: string; size: number }>): {
  distinct: boolean
} {
  // Single image is always considered distinct (no comparison needed)
  if (imageSeeds.length < 2) {
    return { distinct: true }
  }

  // Check file size variance (similar sizes might indicate duplicates)
  const sizes = imageSeeds.map(seed => seed.size)
  const minSize = Math.min(...sizes)
  const maxSize = Math.max(...sizes)
  const sizeVariance = maxSize > 0 ? (maxSize - minSize) / maxSize : 0

  // Check filename patterns (if all have similar names, might be duplicates)
  const names = imageSeeds.map(seed => seed.name.toLowerCase())
  const nameSimilarity = names.every(name => 
    names.some(other => other !== name && (
      name.includes(other.substring(0, 5)) || 
      other.includes(name.substring(0, 5))
    ))
  )

  // If sizes are very similar (< 5% variance) AND names are similar, likely duplicates
  const isDistinct = sizeVariance > 0.05 || !nameSimilarity

  return { distinct: isDistinct }
}
