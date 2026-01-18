// lib/scanner/wikiEngine.ts
// 🔒 B.1 — DEEPEN WIKI INTELLIGENCE (FOUNDATION LAYER)

import type { WikiResult, ScanContext } from "./types";

/**
 * 🔒 B.1.2 — Build ScanContext from imageSeed (foundation only, no real inference yet)
 */
function buildScanContext(imageSeed: string): ScanContext {
  // Create deterministic seed from string
  let seed = 0;
  for (let i = 0; i < imageSeed.length; i++) {
    seed += imageSeed.charCodeAt(i);
  }

  // Generate context from seed (varied, but deterministic per image)
  const focusOptions: Array<"sharp" | "moderate" | "blurry"> = ["sharp", "moderate", "blurry"];
  const noiseOptions: Array<"low" | "moderate" | "high"> = ["low", "moderate", "high"];
  const lightingOptions: Array<"good" | "dim" | "harsh"> = ["good", "dim", "harsh"];

  return {
    imageQuality: {
      focus: focusOptions[seed % focusOptions.length],
      noise: noiseOptions[(seed * 2) % noiseOptions.length],
      lighting: lightingOptions[(seed * 3) % lightingOptions.length],
    },
    detectedFeatures: {
      leafShape: seed % 5 === 0 ? "broad" : seed % 5 === 1 ? "narrow" : "varies",
      trichomeDensity: seed % 4 === 0 ? "heavy" : seed % 4 === 1 ? "moderate" : seed % 4 === 2 ? "light" : "very dense",
      pistilColor: seed % 6 === 0 ? "orange" : seed % 6 === 1 ? "amber" : seed % 6 === 2 ? "white" : seed % 6 === 3 ? "pink" : "mixed",
    },
    uncertaintySignals: seed % 7 === 0 ? {
      conflictingTraits: ["Leaf structure suggests different lineage", "Trichome density unusual for reported type"]
    } : undefined,
  };
}

export async function runWikiEngine(imageFile: File): Promise<WikiResult> {
  // Generate hash with variation from file metadata + timestamp
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const imageSeed = `${imageFile.name}-${imageFile.size}-${imageFile.lastModified}-${timestamp}-${random}`;
  const context = buildScanContext(imageSeed);
  return buildWikiResult({ imageSeed, context });
}

export async function analyzeWithWiki(input: {
  image: File | null;
}): Promise<WikiResult> {
  // Generate deterministic hash from file metadata
  const imageSeed = input.image
    ? `${input.image.name}-${input.image.size}-${input.image.lastModified}`
    : `default-${Date.now()}`;
  const context = buildScanContext(imageSeed);
  return buildWikiResult({ imageSeed, context });
}

/**
 * 🔒 B.1.3 & B.1.4 — Build WikiResult with expanded structure and variance
 */
export function buildWikiResult(input: {
  imageSeed: string;
  context?: ScanContext;
}): WikiResult {
  // Create more varied seed from seed string characters
  let seed = 0;
  for (let i = 0; i < input.imageSeed.length; i++) {
    seed += input.imageSeed.charCodeAt(i);
  }
  seed = seed % 1000; // Normalize to 0-999 range

  // Build context if not provided
  const context = input.context || buildScanContext(input.imageSeed);

  // 🔒 B.1.4 — Ensure variance: use seed variations for different calculations
  const seed2 = (seed * 1.7) % 1000;
  const seed3 = (seed * 2.3) % 1000;
  const confidenceBase = 65 + (seed % 30); // 65-94% range (never hard 81%)
  const confidence = Math.min(94, Math.max(65, confidenceBase));

  // More variety in strain names
  const strainOptions = [
    "Northern Lights",
    "Afghan Kush",
    "Blue Dream",
    "Girl Scout Cookies",
    "OG Kush",
    "White Widow",
    "Sour Diesel",
    "Granddaddy Purple",
    "Pineapple Express",
    "Jack Herer",
    "Purple Haze",
    "AK-47",
  ];
  const strainIndex = seed % strainOptions.length;
  const alternateStrainIndex = (seed2 % (strainOptions.length - 1));
  const alternateMatch = alternateStrainIndex >= strainIndex 
    ? strainOptions[alternateStrainIndex + 1]
    : strainOptions[alternateStrainIndex];

  // More variety in dominance
  const dominanceOptions: Array<"Indica" | "Sativa" | "Hybrid" | "Unknown"> = [
    "Indica",
    "Sativa",
    "Hybrid",
    "Hybrid",
  ];
  const dominanceIndex = Math.floor((seed * 1.3) % dominanceOptions.length);

  // Conditional branches based on context (B.1.4)
  const hasUncertainty = context.uncertaintySignals !== undefined;
  const confidenceAdjustment = hasUncertainty ? -5 : 0;
  const finalConfidence = Math.max(65, confidence + confidenceAdjustment);

  // Expanded terpene profiles
  const terpeneProfiles = [
    [
      { name: "Myrcene", confidence: 0.82 },
      { name: "Caryophyllene", confidence: 0.61 },
      { name: "Limonene", confidence: 0.44 }
    ],
    [
      { name: "Linalool", confidence: 0.75 },
      { name: "Pinene", confidence: 0.68 },
      { name: "Terpinolene", confidence: 0.52 }
    ],
    [
      { name: "Humulene", confidence: 0.71 },
      { name: "Ocimene", confidence: 0.64 },
      { name: "Myrcene", confidence: 0.58 }
    ],
    [
      { name: "Caryophyllene", confidence: 0.79 },
      { name: "Limonene", confidence: 0.66 },
      { name: "Pinene", confidence: 0.54 }
    ],
    [
      { name: "Terpinolene", confidence: 0.83 },
      { name: "Myrcene", confidence: 0.72 },
      { name: "Pinene", confidence: 0.61 }
    ],
  ];
  const selectedTerpenes = terpeneProfiles[seed % terpeneProfiles.length];

  // Visual traits based on context
  const visualTraitsOptions = [
    ["Broad leaves", "Dense bud structure", "Amber trichomes"],
    ["Narrow leaves", "Loose bud structure", "Clear trichomes"],
    ["Variegated coloration", "Medium density", "Mixed trichomes"],
    ["Deep green hue", "Tight calyxes", "Milky trichomes"],
  ];
  const visualTraits = visualTraitsOptions[seed2 % visualTraitsOptions.length];

  // Growth indicators
  const growthIndicatorsOptions = [
    ["Resilient to temperature swings", "Medium flowering period"],
    ["Prefers stable conditions", "Fast flowering"],
    ["Adaptable growth pattern", "Extended flowering"],
  ];
  const growthIndicators = growthIndicatorsOptions[seed3 % growthIndicatorsOptions.length];

  // Experience variations
  const experienceProfiles = [
    {
      effects: ["Relaxation", "Sedation", "Body calm"],
      primaryEffects: ["Relaxation", "Sedation"],
      secondaryEffects: ["Body calm", "Pain relief"],
      onset: "Gradual",
      duration: "2–4 hours",
      bestUse: ["Evening", "Sleep support"],
      varianceNotes: seed % 3 === 0 ? "Effects may vary with individual tolerance" : undefined,
    },
    {
      effects: ["Euphoric", "Creative", "Energetic"],
      primaryEffects: ["Euphoric", "Creative"],
      secondaryEffects: ["Energetic", "Focus"],
      onset: "Quick",
      duration: "3–5 hours",
      bestUse: ["Daytime", "Creative work"],
      varianceNotes: seed % 3 === 0 ? "Onset time varies by consumption method" : undefined,
    },
    {
      effects: ["Happy", "Uplifted", "Focused"],
      primaryEffects: ["Happy", "Uplifted"],
      secondaryEffects: ["Focused", "Social"],
      onset: "Moderate",
      duration: "2–3 hours",
      bestUse: ["Social", "Recreation"],
      varianceNotes: seed % 4 === 0 ? "Experience influenced by set and setting" : undefined,
    },
    {
      effects: ["Relaxed", "Sleepy", "Hungry"],
      primaryEffects: ["Relaxed", "Sleepy"],
      secondaryEffects: ["Hungry", "Calm"],
      onset: "Gradual",
      duration: "2–4 hours",
      bestUse: ["Meditation", "Relaxation"],
      varianceNotes: undefined,
    },
    {
      effects: ["Giggly", "Talkative", "Happy"],
      primaryEffects: ["Giggly", "Talkative"],
      secondaryEffects: ["Happy", "Euphoric"],
      onset: "Quick",
      duration: "1–3 hours",
      bestUse: ["Social", "Entertainment"],
      varianceNotes: seed % 5 === 0 ? "Effects may be stronger for new users" : undefined,
    },
  ];
  const experienceProfile = experienceProfiles[seed % experienceProfiles.length];

  // Reasoning section (B.1.3)
  const reasoningTexts = [
    "Visual characteristics align with typical morphology for this cultivar. Trichome density and leaf structure match historical specimens.",
    "Bud structure and coloration patterns are consistent with known genetic profiles. Pistil color suggests proper maturity.",
    "Morphological traits correspond to documented lineage. Some variance in trichome presentation may indicate phenotype variation.",
  ];
  const reasoningIndex = seed % reasoningTexts.length;

  // Genetics lineage variations
  const lineageOptions = [
    ["Afghani", "Thai"],
    ["Skunk", "Northern Lights"],
    ["OG Kush", "Unknown"],
    ["Hindu Kush", "Colombian Gold"],
    ["Purple Afghan", "Thai Stick"],
  ];
  const selectedLineage = lineageOptions[seed2 % lineageOptions.length];

  // Confidence notes based on uncertainty
  const confidenceNotes = hasUncertainty
    ? "Some visual traits show variance from typical profile, suggesting possible phenotype or environmental influence."
    : seed % 4 === 0
    ? "Visual characteristics strongly align with documented specimens of this cultivar."
    : undefined;

  // Conflicting signals for reasoning
  const conflictingSignals = hasUncertainty && context.uncertaintySignals?.conflictingTraits
    ? context.uncertaintySignals.conflictingTraits
    : undefined;

  return {
    identity: {
      strainName: strainOptions[strainIndex],
      confidence: finalConfidence,
      alternateMatches: seed % 5 === 0 ? [] : [
        {
          strainName: alternateMatch,
          confidence: Math.max(55, finalConfidence - 8 - (seed % 10)),
        },
      ],
    },

    genetics: {
      dominance: dominanceOptions[dominanceIndex],
      lineage: selectedLineage,
      breederNotes: "This cultivar traces back to early resin-focused breeding programs.",
      confidenceNotes,
    },

    morphology: {
      budStructure: "Dense, conical flowers with heavy trichome coverage",
      coloration: "Deep forest green with amber pistils",
      trichomes: "Capitate-stalked, high density",
      visualTraits,
      growthIndicators,
    },

    chemistry: {
      terpenes: selectedTerpenes,
      cannabinoids: {
        THC: "18–22%",
        CBD: "<1%",
      },
      likelyTerpenes: selectedTerpenes.slice(0, 3),
      cannabinoidRange: seed % 3 === 0 ? "18–22% THC, <1% CBD" : seed % 3 === 1 ? "20–24% THC, <1% CBD" : "16–20% THC, 1–2% CBD",
    },

    experience: {
      effects: experienceProfile.effects,
      onset: experienceProfile.onset,
      duration: experienceProfile.duration,
      bestUse: experienceProfile.bestUse,
      primaryEffects: experienceProfile.primaryEffects,
      secondaryEffects: experienceProfile.secondaryEffects,
      varianceNotes: experienceProfile.varianceNotes,
    },

    cultivation: {
      difficulty: "Easy–Moderate",
      floweringTime: "7–9 weeks",
      yield: "Medium–High",
      notes: "Responds well to topping and low-stress training",
    },

    reasoning: {
      whyThisMatch: reasoningTexts[reasoningIndex],
      conflictingSignals,
    },

    disclaimer: "AI-assisted analysis. Not a substitute for laboratory testing.",
  };
}
