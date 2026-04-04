// lib/scanner/wikiEngine.ts
// 🔒 B.1 — AI-POWERED WIKI INTELLIGENCE (GPT-4o VISION)
// Sends actual images to /api/scan for real AI analysis
// Falls back to heuristic analysis if API call fails

import type { WikiResult, ScanContext } from "./types";

/**
 * In-memory cache to avoid duplicate API calls during a single scan session.
 * Key: file identity (name + size + lastModified)
 * Value: cached WikiResult
 */
const scanCache = new Map<string, WikiResult>();

function getCacheKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

/**
 * Clear the scan cache (call between scan sessions)
 */
export function clearScanCache(): void {
  scanCache.clear();
}

/**
 * Build ScanContext from parameters
 */
function buildScanContext({
  imageCount,
  anglesInferred,
}: {
  imageCount: number;
  anglesInferred: boolean;
}): ScanContext {
  return {
    imageCount,
    anglesInferred,
  };
}

/**
 * Convert a File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // Returns full data:image/...;base64,... URL
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call the real AI scanner API
 */
async function callScanAPI(
  images: string[]
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });

    if (!response.ok) {
      console.warn("Scan API returned", response.status);
      return null;
    }

    const data = await response.json();
    if (data.ok && data.result) {
      return data.result;
    }

    console.warn("Scan API returned unexpected shape:", data);
    return null;
  } catch (error) {
    console.error("Scan API call failed:", error);
    return null;
  }
}

/**
 * Main entry: Analyze image(s) with real AI vision
 * Caches results to avoid duplicate API calls during a scan session.
 */
export async function runWikiEngine(
  imageFile: File,
  imageCount: number = 1
): Promise<WikiResult> {
  // Check cache first (avoids double API calls from pipeline + consensus paths)
  const cacheKey = getCacheKey(imageFile);
  const cached = scanCache.get(cacheKey);
  if (cached) {
    console.log("wikiEngine: cache hit for", imageFile.name);
    return cached;
  }

  // Skip API call for empty/synthetic files (no real image data)
  if (imageFile.size === 0) {
    console.warn("wikiEngine: empty file, returning fallback");
    const fallback = buildFallbackResult(imageFile, imageCount);
    scanCache.set(cacheKey, fallback);
    return fallback;
  }

  // Convert image to base64
  const base64 = await fileToBase64(imageFile);

  // Call the real AI scanner
  const aiResult = await callScanAPI([base64]);

  if (aiResult) {
    const result = mapToWikiResult(aiResult);
    scanCache.set(cacheKey, result);
    return result;
  }

  // Fallback to heuristic if API fails
  console.warn("Falling back to heuristic analysis");
  const fallback = buildFallbackResult(imageFile, imageCount);
  scanCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Alternate entry point (used by some scanner paths)
 */
export async function analyzeWithWiki(input: {
  image: File | null;
  imageCount?: number;
}): Promise<WikiResult> {
  if (!input.image) {
    return buildFallbackResult(null, input.imageCount || 1);
  }
  return runWikiEngine(input.image, input.imageCount || 1);
}

/**
 * For multi-image scanning — analyze all images in one API call
 */
export async function runWikiEngineMulti(
  imageFiles: File[]
): Promise<WikiResult> {
  // Convert all images to base64
  const base64Images = await Promise.all(imageFiles.map(fileToBase64));

  // Call API with all images for better analysis
  const aiResult = await callScanAPI(base64Images);

  if (aiResult) {
    return mapToWikiResult(aiResult);
  }

  // Fallback
  console.warn("Multi-image scan falling back to single-image heuristic");
  return buildFallbackResult(imageFiles[0] || null, imageFiles.length);
}

/**
 * Map AI API response to WikiResult type
 */
function mapToWikiResult(data: Record<string, unknown>): WikiResult {
  const identity = (data.identity as Record<string, unknown>) || {};
  const genetics = (data.genetics as Record<string, unknown>) || {};
  const morphology = (data.morphology as Record<string, unknown>) || {};
  const chemistry = (data.chemistry as Record<string, unknown>) || {};
  const experience = (data.experience as Record<string, unknown>) || {};
  const cultivation = (data.cultivation as Record<string, unknown>) || {};
  const reasoning = (data.reasoning as Record<string, unknown>) || {};

  return {
    identity: {
      strainName: (identity.strainName as string) || "Unknown Cultivar",
      confidence: Number(identity.confidence) || 60,
      alternateMatches: Array.isArray(identity.alternateMatches)
        ? (identity.alternateMatches as Array<{ strainName: string; confidence: number }>)
        : [],
    },
    genetics: {
      dominance: (genetics.dominance as "Indica" | "Sativa" | "Hybrid" | "Unknown") || "Hybrid",
      lineage: (genetics.lineage as string[]) || [],
      breederNotes: (genetics.breederNotes as string) || "",
      confidenceNotes: (genetics.confidenceNotes as string) || undefined,
    },
    morphology: {
      budStructure: (morphology.budStructure as string) || "",
      coloration: (morphology.coloration as string) || "",
      trichomes: (morphology.trichomes as string) || "",
      visualTraits: (morphology.visualTraits as string[]) || [],
      growthIndicators: (morphology.growthIndicators as string[]) || [],
    },
    chemistry: {
      terpenes: (chemistry.terpenes as Array<{ name: string; confidence: number }>) || [],
      cannabinoids: (chemistry.cannabinoids as { THC: string; CBD: string }) || {
        THC: "Unknown",
        CBD: "Unknown",
      },
      likelyTerpenes: (chemistry.likelyTerpenes as Array<{ name: string; confidence: number }>) ||
        (chemistry.terpenes as Array<{ name: string; confidence: number }>)?.slice(0, 3) || [],
      cannabinoidRange: (chemistry.cannabinoidRange as string) || "",
    },
    experience: {
      effects: (experience.effects as string[]) || [],
      onset: (experience.onset as string) || "Moderate",
      duration: (experience.duration as string) || "2-4 hours",
      bestUse: (experience.bestUse as string[]) || [],
      primaryEffects: (experience.primaryEffects as string[]) || [],
      secondaryEffects: (experience.secondaryEffects as string[]) || [],
      varianceNotes: (experience.varianceNotes as string) || undefined,
    },
    cultivation: {
      difficulty: (cultivation.difficulty as string) || "Moderate",
      floweringTime: (cultivation.floweringTime as string) || "8-10 weeks",
      yield: (cultivation.yield as string) || "Medium",
      notes: (cultivation.notes as string) || "",
    },
    reasoning: {
      whyThisMatch: (reasoning.whyThisMatch as string) || "AI visual analysis",
      conflictingSignals: (reasoning.conflictingSignals as string[]) || undefined,
    },
    disclaimer:
      "AI-assisted visual analysis. Not a substitute for laboratory testing.",
  };
}

/**
 * Fallback heuristic when API is unavailable
 * Uses file metadata to produce a reasonable default
 */
function buildFallbackResult(
  imageFile: File | null,
  imageCount: number
): WikiResult {
  return {
    identity: {
      strainName: "Analysis Pending",
      confidence: 55,
      alternateMatches: [],
    },
    genetics: {
      dominance: "Unknown",
      lineage: [],
      breederNotes:
        "Unable to reach AI analysis service. Please try again.",
      confidenceNotes:
        "This is a fallback result — the AI scanner could not process your image at this time.",
    },
    morphology: {
      budStructure: "Unable to analyze — scanner temporarily unavailable",
      coloration: "Unable to analyze",
      trichomes: "Unable to analyze",
      visualTraits: [],
      growthIndicators: [],
    },
    chemistry: {
      terpenes: [{ name: "Unknown", confidence: 0 }],
      cannabinoids: { THC: "Unknown", CBD: "Unknown" },
      likelyTerpenes: [],
      cannabinoidRange: "Unknown",
    },
    experience: {
      effects: ["Unable to predict"],
      onset: "Unknown",
      duration: "Unknown",
      bestUse: [],
      primaryEffects: [],
      secondaryEffects: [],
    },
    cultivation: {
      difficulty: "Unknown",
      floweringTime: "Unknown",
      yield: "Unknown",
      notes: "Retry scan for full analysis",
    },
    reasoning: {
      whyThisMatch:
        "AI scanner temporarily unavailable. Please try scanning again.",
      conflictingSignals: ["Scanner API unreachable"],
    },
    disclaimer:
      "AI-assisted visual analysis. Not a substitute for laboratory testing.",
  };
}

/**
 * Legacy export — kept for compatibility with buildWikiResult calls elsewhere
 */
export function buildWikiResult(input: {
  imageSeed: string;
  context?: ScanContext;
}): WikiResult {
  // This is the legacy mock path — return a minimal fallback
  return buildFallbackResult(null, input.context?.imageCount || 1);
}
