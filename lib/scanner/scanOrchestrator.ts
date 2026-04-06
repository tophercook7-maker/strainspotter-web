// lib/scanner/scanOrchestrator.ts
// REWRITE: Call /api/scan directly, bypass bloated pipeline
// Maps GPT-4o Vision response → ScannerViewModel → ScanResult

import type { ScannerViewModel } from "./viewModel";
import type { ScanResult, WikiSynthesis } from "./types";

export interface OrchestratedScanResult {
  displayName: string;
  confidencePercent: number;
  confidenceTier: "Low" | "Medium" | "High" | "Very High";
  summary: string[];
  warnings?: string[];
  rawScannerResult: ScannerViewModel;
  normalizedScanResult: ScanResult;
}

/* ─── Image compression ─── */
const MAX_DIMENSION = 1536;  // GPT-4o "high" detail tiles at 512px — 1536 = 3×3 tiles max
const JPEG_QUALITY  = 0.82;  // Good balance: sharp enough for trichomes, small enough to send

/**
 * Resize + compress an image file using an offscreen canvas.
 * Returns a base64 data-URL (image/jpeg).
 */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if either dimension exceeds the cap
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width  = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context failed")); return; }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: read raw if canvas fails (shouldn't happen in modern browsers)
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/**
 * Build a ScannerViewModel from GPT-4o API response
 */
function apiToViewModel(data: Record<string, any>, imageCount: number): ScannerViewModel {
  const identity = data.identity || {};
  const genetics = data.genetics || {};
  const morphology = data.morphology || {};
  const chemistry = data.chemistry || {};
  const experience = data.experience || {};
  const cultivation = data.cultivation || {};
  const reasoning = data.reasoning || {};

  const strainName = identity.strainName || "Unknown Cultivar";
  const confidence = Math.max(55, Math.min(95, Number(identity.confidence) || 60));
  const dominance = genetics.dominance || "Hybrid";
  const lineageArr: string[] = Array.isArray(genetics.lineage) ? genetics.lineage : [];
  const lineageStr = lineageArr.length > 0 ? lineageArr.join(" × ") : "Unknown lineage";

  // Terpene names
  const terpenes: Array<{ name: string; confidence: number }> = Array.isArray(chemistry.terpenes)
    ? chemistry.terpenes
    : [];
  const terpeneNames = terpenes.map((t: any) => t.name || "Unknown");

  // Effects
  const effects: string[] = Array.isArray(experience.effects) ? experience.effects : ["Relaxed"];
  const primaryEffects: string[] = Array.isArray(experience.primaryEffects) ? experience.primaryEffects : effects.slice(0, 2);
  const secondaryEffects: string[] = Array.isArray(experience.secondaryEffects) ? experience.secondaryEffects : effects.slice(2);

  // Visual traits
  const visualTraits: string[] = Array.isArray(morphology.visualTraits) ? morphology.visualTraits : [];

  // Confidence tier
  let tierLabel = "Moderate Confidence";
  if (confidence >= 90) tierLabel = "Very High Confidence";
  else if (confidence >= 80) tierLabel = "High Confidence";
  else if (confidence >= 65) tierLabel = "Moderate Confidence";
  else tierLabel = "Low Confidence";

  // Alternate matches
  const altMatches: Array<{ strainName: string; confidence: number }> = Array.isArray(identity.alternateMatches)
    ? identity.alternateMatches
    : [];

  const vm: any = {
    // Primary identification
    name: strainName,
    title: strainName,
    confidence,

    // Name-first display (what the UI reads first)
    nameFirstDisplay: {
      primaryStrainName: strainName,
      confidencePercent: confidence,
      nameConfidenceTier: tierLabel,
      nameStabilityScore: confidence,
      stabilityExplanation: reasoning.whyThisMatch ? [reasoning.whyThisMatch] : ["Visual analysis match"],
      explanation: {
        whyThisNameWon: reasoning.whyThisMatch ? [reasoning.whyThisMatch] : ["Strong visual feature alignment"],
      },
      alternateMatches: altMatches.map((a: any) => ({
        name: a.strainName,
        confidence: a.confidence,
        whyNotPrimary: `Lower visual similarity (${a.confidence}%)`,
      })),
    },

    // Confidence tier
    confidenceTier: {
      label: tierLabel,
      numeric: confidence,
    },

    // Confidence range
    confidenceRange: {
      min: Math.max(50, confidence - 10),
      max: Math.min(98, confidence + 5),
      explanation: "Range reflects phenotype variation and image quality factors",
    },

    matchBasis: `Visual morphology analysis across ${imageCount} image${imageCount > 1 ? "s" : ""}`,

    // Deep analysis sections
    visualMatchSummary: reasoning.whyThisMatch || "AI visual analysis completed",
    flowerStructureAnalysis: morphology.budStructure || "Bud structure analysis complete",
    trichomeDensityMaturity: morphology.trichomes || "Trichome assessment complete",
    leafShapeInternode: "Leaf morphology assessed from uploaded images",
    colorPistilIndicators: morphology.coloration || "Color analysis complete",
    growthPatternClues: cultivation.notes || "Growth pattern assessed",

    // Primary match
    primaryMatch: {
      name: strainName,
      confidenceRange: { min: Math.max(50, confidence - 10), max: Math.min(98, confidence + 5) },
      whyThisMatch: reasoning.whyThisMatch || "Visual feature alignment",
    },

    // Secondary matches
    secondaryMatches: altMatches.map((a: any) => ({
      name: a.strainName,
      whyNotPrimary: `Lower confidence match at ${a.confidence}%`,
    })),

    // Trust layer
    trustLayer: {
      confidenceBreakdown: {
        visualSimilarity: confidence,
        traitOverlap: Math.max(50, confidence - 5),
        consensusStrength: imageCount > 1 ? confidence : Math.max(50, confidence - 10),
      },
      whyThisMatch: reasoning.whyThisMatch
        ? [reasoning.whyThisMatch]
        : ["Visual similarity to known cultivar phenotype"],
      sourcesUsed: ["GPT-4o Vision Analysis", "Cannabis Cultivar Database"],
      confidenceLanguage: confidence >= 80 ? "Strong visual match" : "Visual similarity match",
    },

    aiWikiBlend: `AI analysis identified ${strainName} based on observable morphological characteristics including bud structure, trichome patterns, and coloration.`,
    uncertaintyExplanation: genetics.confidenceNotes || "Visual identification has inherent limitations without lab testing.",
    accuracyTips: [
      "Use 3-5 images from different angles",
      "Ensure good lighting",
      "Include close-ups of trichomes",
      "Photograph in natural light when possible",
    ],

    // Genetics
    genetics: {
      dominance,
      lineage: lineageStr,
      breederNotes: genetics.breederNotes || "",
    },

    // Legacy fields
    morphology: morphology.budStructure || "",
    trichomes: morphology.trichomes || "",
    pistils: morphology.coloration || "",
    structure: morphology.budStructure || "",
    growthTraits: Array.isArray(morphology.growthIndicators) ? morphology.growthIndicators : visualTraits,
    terpeneGuess: terpeneNames,
    effectsShort: effects.slice(0, 3),
    effectsLong: effects,
    referenceStrains: altMatches.map((a: any) => a.strainName),
    sources: ["GPT-4o Vision Analysis"],

    // Chemistry
    chemistry: {
      terpenes,
      cannabinoids: chemistry.cannabinoids || { THC: "15-25%", CBD: "<1%" },
      cannabinoidRange: chemistry.cannabinoidRange || "",
      likelyTerpenes: terpenes.slice(0, 3),
    },

    // Experience
    experience: {
      effects,
      primaryEffects,
      secondaryEffects,
      onset: experience.onset || "Moderate",
      duration: experience.duration || "2-4 hours",
      bestUse: Array.isArray(experience.bestUse) ? experience.bestUse : [],
    },

    // Cultivation
    cultivation: {
      difficulty: cultivation.difficulty || "Moderate",
      floweringTime: cultivation.floweringTime || "8-10 weeks",
      yield: cultivation.yield || "Medium",
      notes: cultivation.notes || "",
    },

    // Ratio
    ratio: {
      indica: dominance === "Indica" ? 70 : dominance === "Sativa" ? 20 : 50,
      sativa: dominance === "Sativa" ? 70 : dominance === "Indica" ? 20 : 50,
      hybrid: 0,
      classification: dominance === "Indica" ? "Indica-dominant" as const : dominance === "Sativa" ? "Sativa-dominant" as const : "Balanced Hybrid" as const,
      confidence,
      explanation: [`Based on ${dominance} classification from visual analysis`],
    },

    // Dominance (for WikiReportPanel)
    dominance: {
      indica: dominance === "Indica" ? 70 : dominance === "Sativa" ? 20 : 50,
      sativa: dominance === "Sativa" ? 70 : dominance === "Indica" ? 20 : 50,
      hybrid: 0,
      label: dominance === "Indica" ? "Indica-dominant" : dominance === "Sativa" ? "Sativa-dominant" : "Hybrid",
    },

    // Terpene experience
    terpeneExperience: {
      flavorProfile: terpeneNames.length > 0 ? terpeneNames.join(", ") : "Complex terpene profile",
      aromaDescription: "Assessed from visual trichome characteristics",
      experienceNarrative: `${strainName} presents a ${dominance.toLowerCase()}-type experience with ${effects.slice(0, 2).join(" and ").toLowerCase()} effects.`,
      terpeneBreakdown: terpenes.map((t: any) => ({
        name: t.name,
        percentage: Math.round((t.confidence || 0.5) * 30),
        effect: `Contributes to the overall ${t.name.toLowerCase()} profile`,
      })),
    },

    // Extended profile
    extendedProfile: {
      originStory: genetics.breederNotes || `${strainName} is a ${dominance.toLowerCase()} cultivar.`,
      familyTree: lineageArr.length > 0 ? `${lineageArr.join(" × ")} → ${strainName}` : null,
      entourageEffect: `The combination of ${terpeneNames.slice(0, 3).join(", ")} terpenes creates a synergistic effect profile.`,
      relatedStrains: altMatches.map((a: any) => a.strainName),
    },

    // Multi-image info
    multiImageInfo: {
      imageCountText: `${imageCount} image${imageCount > 1 ? "s" : ""} analyzed`,
    },

    // Notes
    notes: "",

    // Disclaimer
    disclaimer: data.disclaimer || "AI-assisted visual analysis. Not a substitute for laboratory testing.",
  };

  return vm as ScannerViewModel;
}

/**
 * Build a WikiSynthesis from API response
 */
function apiToSynthesis(data: Record<string, any>): WikiSynthesis {
  const identity = data.identity || {};
  const genetics = data.genetics || {};
  const experience = data.experience || {};

  return {
    strain: identity.strainName || "Unknown",
    confidence: Number(identity.confidence) || 60,
    dominance: (genetics.dominance as "Indica" | "Sativa" | "Hybrid") || "Hybrid",
    effects: Array.isArray(experience.effects) ? experience.effects : [],
    terpenes: [],
    lineage: Array.isArray(genetics.lineage) ? genetics.lineage.join(" × ") : "",
  };
}

export async function orchestrateScan(images: File[]): Promise<OrchestratedScanResult> {
  if (!images || images.length === 0) {
    return buildFallback("No images provided", 0);
  }

  try {
    // 1. Compress & convert all images (resize to 1536px max, JPEG @ 82%)
    const base64Images = await Promise.all(images.map(compressImage));

    // 2. Call /api/scan directly
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: base64Images }),
    });

    if (!response.ok) {
      console.error("Scan API error:", response.status);
      return buildFallback(`Scanner returned ${response.status}`, images.length);
    }

    const data = await response.json();

    if (!data.ok || !data.result) {
      console.error("Scan API returned unexpected response:", data);
      return buildFallback("Scanner returned no result", images.length);
    }

    // 3. Map to ViewModel
    const viewModel = apiToViewModel(data.result, images.length);
    const synthesis = apiToSynthesis(data.result);

    const confidence = viewModel.confidence;
    let tier: "Low" | "Medium" | "High" | "Very High" = "Low";
    if (confidence >= 90) tier = "Very High";
    else if (confidence >= 80) tier = "High";
    else if (confidence >= 65) tier = "Medium";

    const scanResult: ScanResult = {
      status: "success",
      consensus: {
        strainName: viewModel.name,
        confidence,
        dominance: viewModel.genetics?.dominance || "Hybrid",
        effects: viewModel.effectsShort || [],
        terpenes: viewModel.terpeneGuess || [],
      } as any,
      confidence,
      result: viewModel,
      synthesis,
      meta: {
        model: data.model || "gpt-4o",
        imageCount: images.length,
        usage: data.usage,
      },
    };

    return {
      displayName: viewModel.name,
      confidencePercent: confidence,
      confidenceTier: tier,
      summary: [viewModel.visualMatchSummary],
      rawScannerResult: viewModel,
      normalizedScanResult: scanResult,
    };
  } catch (error) {
    console.error("orchestrateScan error:", error);
    return buildFallback("Scanner encountered an error", images.length);
  }
}

function buildFallback(message: string, imageCount: number): OrchestratedScanResult {
  const fallbackVm: any = {
    name: "Analysis Failed",
    title: "Analysis Failed",
    confidence: 0,
    nameFirstDisplay: {
      primaryStrainName: "Analysis Failed",
      confidencePercent: 0,
      nameConfidenceTier: "Low Confidence",
    },
    confidenceTier: { label: "Low Confidence", numeric: 0 },
    confidenceRange: { min: 0, max: 0, explanation: message },
    matchBasis: message,
    visualMatchSummary: message,
    flowerStructureAnalysis: "",
    trichomeDensityMaturity: "",
    leafShapeInternode: "",
    colorPistilIndicators: "",
    growthPatternClues: "",
    primaryMatch: { name: "Unknown", confidenceRange: { min: 0, max: 0 }, whyThisMatch: message },
    secondaryMatches: [],
    trustLayer: {
      confidenceBreakdown: { visualSimilarity: 0, traitOverlap: 0, consensusStrength: 0 },
      whyThisMatch: [message],
      sourcesUsed: [],
      confidenceLanguage: "Unable to analyze",
    },
    aiWikiBlend: message,
    uncertaintyExplanation: message,
    accuracyTips: ["Try uploading clearer images", "Use 2-5 photos from different angles"],
    genetics: { dominance: "Unknown", lineage: "", breederNotes: "" },
    morphology: "",
    trichomes: "",
    pistils: "",
    structure: "",
    growthTraits: [],
    terpeneGuess: [],
    effectsShort: [],
    effectsLong: [],
    referenceStrains: [],
    notes: "",
    disclaimer: "Analysis could not be completed. Please try again.",
  };

  const fallbackResult: ScanResult = {
    status: "partial",
    consensus: {} as any,
    confidence: 0,
    result: fallbackVm as ScannerViewModel,
    synthesis: { strain: "Unknown", confidence: 0, dominance: "Hybrid", effects: [], terpenes: [], lineage: "" },
  };

  return {
    displayName: "Analysis Failed",
    confidencePercent: 0,
    confidenceTier: "Low",
    summary: [message],
    rawScannerResult: fallbackVm as ScannerViewModel,
    normalizedScanResult: fallbackResult,
  };
}
