// Phase 4.3.3 — VISUAL TRAIT ANCHORING
// lib/scanner/visualAnchors.ts

export interface VisualAnchor {
  trait: string
  strength: number
  sourceImages: number
}

export function buildVisualAnchors(
  imageResults: Array<{
    wikiResult?: {
      morphology?: {
        visualTraits?: string[]
      }
    }
    detectedTraits?: {
      budStructure?: "low" | "medium" | "high"
      trichomeDensity?: "low" | "medium" | "high"
      pistilColor?: string
      leafShape?: "narrow" | "broad"
    }
  }>
): VisualAnchor[] {
  if (!imageResults || imageResults.length === 0) {
    return []
  }

  const map = new Map<string, { total: number; count: number }>()

  for (const img of imageResults) {
    // Extract visual traits from wikiResult.morphology.visualTraits (string array)
    const visualTraits = img.wikiResult?.morphology?.visualTraits ?? []
    for (const trait of visualTraits) {
      if (trait) {
        // Assign default confidence of 75 for string traits
        const current = map.get(trait) ?? { total: 0, count: 0 }
        map.set(trait, {
          total: current.total + 75,
          count: current.count + 1,
        })
      }
    }

    // Extract detected traits and convert to visual trait format
    const detected = img.detectedTraits
    if (detected) {
      if (detected.budStructure) {
        const trait = `Bud structure: ${detected.budStructure}`
        const confidence = detected.budStructure === "high" ? 85 : detected.budStructure === "medium" ? 75 : 65
        const current = map.get(trait) ?? { total: 0, count: 0 }
        map.set(trait, {
          total: current.total + confidence,
          count: current.count + 1,
        })
      }
      if (detected.trichomeDensity) {
        const trait = `Trichome density: ${detected.trichomeDensity}`
        const confidence = detected.trichomeDensity === "high" ? 85 : detected.trichomeDensity === "medium" ? 75 : 65
        const current = map.get(trait) ?? { total: 0, count: 0 }
        map.set(trait, {
          total: current.total + confidence,
          count: current.count + 1,
        })
      }
      if (detected.pistilColor) {
        const trait = `Pistil color: ${detected.pistilColor}`
        const current = map.get(trait) ?? { total: 0, count: 0 }
        map.set(trait, {
          total: current.total + 70,
          count: current.count + 1,
        })
      }
      if (detected.leafShape) {
        const trait = `Leaf shape: ${detected.leafShape}`
        const current = map.get(trait) ?? { total: 0, count: 0 }
        map.set(trait, {
          total: current.total + 70,
          count: current.count + 1,
        })
      }
    }
  }

  return Array.from(map.entries())
    .map(([trait, data]) => ({
      trait,
      strength: Math.round(data.total / data.count),
      sourceImages: data.count,
    }))
    .filter(a => a.sourceImages >= 2)
    .sort((a, b) => b.strength - a.strength)
}
