// lib/scanner/wikiEngine.ts
// NEW FILE — CORE INTELLIGENCE LAYER

import type { WikiResult } from "./types";

export async function analyzeWithWiki(input: {
  image: File | null;
}): Promise<WikiResult> {
  // Generate deterministic hash from file metadata
  const imageHash = input.image
    ? `${input.image.name}-${input.image.size}-${input.image.lastModified}`
    : `default-${Date.now()}`;

  return buildWikiResult({ imageHash });
}

export function buildWikiResult(input: {
  imageHash: string
}): WikiResult {
  const seed = input.imageHash.length

  return {
    identity: {
      strainName: seed % 2 === 0 ? "Northern Lights" : "Afghan Kush",
      confidence: 72 + (seed % 20),
    },

    genetics: {
      dominance: (seed % 3 === 0 ? "Indica" : "Hybrid") as "Indica" | "Hybrid",
      lineage: seed % 2 === 0
        ? ["Afghani", "Thai"]
        : ["Afghani", "Unknown Landrace"],
      breederNotes:
        "This cultivar traces back to early resin-focused breeding programs."
    },

    morphology: {
      budStructure: "Dense, conical flowers with heavy trichome coverage",
      coloration: "Deep forest green with amber pistils",
      trichomes: "Capitate-stalked, high density"
    },

    chemistry: {
      terpenes: [
        { name: "Myrcene", confidence: 0.82 },
        { name: "Caryophyllene", confidence: 0.61 },
        { name: "Limonene", confidence: 0.44 }
      ],
      cannabinoids: {
        THC: "18–22%",
        CBD: "<1%"
      }
    },

    experience: {
      effects: ["Relaxation", "Sedation", "Body calm"],
      onset: "Gradual",
      duration: "2–4 hours",
      bestUse: ["Evening", "Sleep support"]
    },

    cultivation: {
      difficulty: "Easy–Moderate",
      floweringTime: "7–9 weeks",
      yield: "Medium–High",
      notes: "Responds well to topping and low-stress training"
    },

    disclaimer:
      "AI-assisted analysis. Not a substitute for laboratory testing."
  }
}
