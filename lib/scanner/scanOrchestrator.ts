// lib/scanner/scanOrchestrator.ts
// v2: Dual-mode (Consumer + Grower), Quality Grading, Problem Detection
// Call /api/scan directly — maps response → ScannerViewModel → ScanResult

import type { ScannerViewModel } from "./viewModel";
import type { ScanResult, WikiSynthesis } from "./types";

export type ScanMode = "consumer" | "grower";

export interface OrchestratedScanResult {
  displayName: string;
  confidencePercent: number;
  confidenceTier: "Low" | "Medium" | "High" | "Very High";
  summary: string[];
  warnings?: string[];
  rawScannerResult: ScannerViewModel;
  normalizedScanResult: ScanResult;
  mode: ScanMode;
  /** Full API response (consumer or grower) for the new UI */
  fullResult: Record<string, any>;
}

/* ─── Image compression ─── */
const MAX_DIMENSION = 1536;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context failed")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result as string;
        if (
          raw.startsWith("data:image/jpeg") ||
          raw.startsWith("data:image/png") ||
          raw.startsWith("data:image/gif") ||
          raw.startsWith("data:image/webp")
        ) {
          resolve(raw);
        } else {
          const img2 = new Image();
          img2.onload = () => {
            const c = document.createElement("canvas");
            c.width = Math.min(img2.width, MAX_DIMENSION);
            c.height = Math.min(img2.height, MAX_DIMENSION);
            const ctx2 = c.getContext("2d");
            if (ctx2) ctx2.drawImage(img2, 0, 0, c.width, c.height);
            resolve(c.toDataURL("image/jpeg", JPEG_QUALITY));
          };
          img2.onerror = () => resolve(raw);
          img2.src = raw;
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/* ─── Map consumer API response → ScannerViewModel ─── */
function apiToViewModel(
  data: Record<string, any>,
  imageCount: number
): ScannerViewModel {
  const identity = data.identity || {};
  const genetics = data.genetics || {};
  const morphology = data.morphology || {};
  const chemistry = data.chemistry || {};
  const experience = data.experience || {};
  const cultivation = data.cultivation || {};
  const reasoning = data.reasoning || {};

  const strainName = identity.strainName || "Unknown Cultivar";
  const confidence = Math.max(
    55,
    Math.min(95, Number(identity.confidence) || 60)
  );
  const dominance = genetics.dominance || "Hybrid";
  const lineageArr: string[] = Array.isArray(genetics.lineage)
    ? genetics.lineage
    : [];
  const lineageStr =
    lineageArr.length > 0 ? lineageArr.join(" × ") : "Unknown lineage";

  const terpenes: Array<{ name: string; confidence: number }> = Array.isArray(
    chemistry.terpenes
  )
    ? chemistry.terpenes
    : [];
  const terpeneNames = terpenes.map((t: any) => t.name || "Unknown");

  const effects: string[] = Array.isArray(experience.effects)
    ? experience.effects
    : ["Relaxed"];
  const primaryEffects: string[] = Array.isArray(experience.primaryEffects)
    ? experience.primaryEffects
    : effects.slice(0, 2);
  const secondaryEffects: string[] = Array.isArray(experience.secondaryEffects)
    ? experience.secondaryEffects
    : effects.slice(2);

  const visualTraits: string[] = Array.isArray(morphology.visualTraits)
    ? morphology.visualTraits
    : [];

  let tierLabel = "Moderate Confidence";
  if (confidence >= 90) tierLabel = "Very High Confidence";
  else if (confidence >= 80) tierLabel = "High Confidence";
  else if (confidence >= 65) tierLabel = "Moderate Confidence";
  else tierLabel = "Low Confidence";

  const altMatches: Array<{ strainName: string; confidence: number }> =
    Array.isArray(identity.alternateMatches) ? identity.alternateMatches : [];

  const vm: any = {
    name: strainName,
    title: strainName,
    confidence,

    nameFirstDisplay: {
      primaryStrainName: strainName,
      confidencePercent: confidence,
      nameConfidenceTier: tierLabel,
      nameStabilityScore: confidence,
      stabilityExplanation: reasoning.whyThisMatch
        ? [reasoning.whyThisMatch]
        : ["Visual analysis match"],
      explanation: {
        whyThisNameWon: reasoning.whyThisMatch
          ? [reasoning.whyThisMatch]
          : ["Strong visual feature alignment"],
      },
      alternateMatches: altMatches.map((a: any) => ({
        name: a.strainName,
        confidence: a.confidence,
        whyNotPrimary: `Lower visual similarity (${a.confidence}%)`,
      })),
    },
    confidenceTier: { label: tierLabel, numeric: confidence },
    confidenceRange: {
      min: Math.max(50, confidence - 10),
      max: Math.min(98, confidence + 5),
      explanation:
        "Range reflects phenotype variation and image quality factors",
    },
    matchBasis: `Visual morphology analysis across ${imageCount} image${imageCount > 1 ? "s" : ""}`,
    visualMatchSummary:
      reasoning.whyThisMatch || "AI visual analysis completed",
    flowerStructureAnalysis:
      morphology.budStructure || "Bud structure analysis complete",
    trichomeDensityMaturity:
      morphology.trichomes || "Trichome assessment complete",
    leafShapeInternode: "Leaf morphology assessed from uploaded images",
    colorPistilIndicators: morphology.coloration || "Color analysis complete",
    growthPatternClues: cultivation.notes || "Growth pattern assessed",

    primaryMatch: {
      name: strainName,
      confidenceRange: {
        min: Math.max(50, confidence - 10),
        max: Math.min(98, confidence + 5),
      },
      whyThisMatch: reasoning.whyThisMatch || "Visual feature alignment",
    },
    secondaryMatches: altMatches.map((a: any) => ({
      name: a.strainName,
      whyNotPrimary: `Lower confidence match at ${a.confidence}%`,
    })),
    trustLayer: {
      confidenceBreakdown: {
        visualSimilarity: confidence,
        traitOverlap: Math.max(50, confidence - 5),
        consensusStrength: imageCount > 1
          ? confidence
          : Math.max(50, confidence - 10),
      },
      whyThisMatch: reasoning.whyThisMatch
        ? [reasoning.whyThisMatch]
        : ["Visual similarity to known cultivar phenotype"],
      sourcesUsed: ["GPT-4o Vision Analysis", "Cannabis Cultivar Database"],
      confidenceLanguage:
        confidence >= 80 ? "Strong visual match" : "Visual similarity match",
    },

    aiWikiBlend: `AI analysis identified ${strainName} based on observable morphological characteristics.`,
    uncertaintyExplanation:
      genetics.confidenceNotes ||
      "Visual identification has inherent limitations without lab testing.",
    accuracyTips: [
      "Use 3-5 images from different angles",
      "Ensure good lighting",
      "Include close-ups of trichomes",
      "Photograph in natural light when possible",
    ],
    genetics: { dominance, lineage: lineageStr, breederNotes: genetics.breederNotes || "" },
    morphology: morphology.budStructure || "",
    trichomes: morphology.trichomes || "",
    pistils: morphology.coloration || "",
    structure: morphology.budStructure || "",
    growthTraits: Array.isArray(morphology.growthIndicators)
      ? morphology.growthIndicators
      : visualTraits,
    terpeneGuess: terpeneNames,
    effectsShort: effects.slice(0, 3),
    effectsLong: effects,
    referenceStrains: altMatches.map((a: any) => a.strainName),
    sources: ["GPT-4o Vision Analysis"],
    chemistry: {
      terpenes,
      cannabinoids: chemistry.cannabinoids || { THC: "15-25%", CBD: "<1%" },
      cannabinoidRange: chemistry.cannabinoidRange || "",
      likelyTerpenes: terpenes.slice(0, 3),
    },
    experience: {
      effects,
      primaryEffects,
      secondaryEffects,
      onset: experience.onset || "Moderate",
      duration: experience.duration || "2-4 hours",
      bestUse: Array.isArray(experience.bestFor)
        ? experience.bestFor
        : Array.isArray(experience.bestUse)
          ? experience.bestUse
          : [],
    },
    cultivation: {
      difficulty: cultivation.difficulty || "Moderate",
      floweringTime: cultivation.floweringTime || "8-10 weeks",
      yield: cultivation.yield || "Medium",
      notes: cultivation.notes || "",
    },
    ratio: {
      indica: dominance === "Indica" ? 70 : dominance === "Sativa" ? 20 : 50,
      sativa: dominance === "Sativa" ? 70 : dominance === "Indica" ? 20 : 50,
      hybrid: 0,
      classification:
        dominance === "Indica"
          ? ("Indica-dominant" as const)
          : dominance === "Sativa"
            ? ("Sativa-dominant" as const)
            : ("Balanced Hybrid" as const),
      confidence,
      explanation: [
        `Based on ${dominance} classification from visual analysis`,
      ],
    },
    dominance: {
      indica: dominance === "Indica" ? 70 : dominance === "Sativa" ? 20 : 50,
      sativa: dominance === "Sativa" ? 70 : dominance === "Indica" ? 20 : 50,
      hybrid: 0,
      label:
        dominance === "Indica"
          ? "Indica-dominant"
          : dominance === "Sativa"
            ? "Sativa-dominant"
            : "Hybrid",
    },
    terpeneExperience: {
      flavorProfile:
        terpeneNames.length > 0
          ? terpeneNames.join(", ")
          : "Complex terpene profile",
      aromaDescription: "Assessed from visual trichome characteristics",
      experienceNarrative: `${strainName} presents a ${dominance.toLowerCase()}-type experience with ${effects.slice(0, 2).join(" and ").toLowerCase()} effects.`,
      terpeneBreakdown: terpenes.map((t: any) => ({
        name: t.name,
        percentage: Math.round((t.confidence || 0.5) * 30),
        effect: `Contributes to the overall ${t.name.toLowerCase()} profile`,
      })),
    },
    extendedProfile: {
      originStory:
        genetics.breederNotes ||
        `${strainName} is a ${dominance.toLowerCase()} cultivar.`,
      familyTree:
        lineageArr.length > 0
          ? `${lineageArr.join(" × ")} → ${strainName}`
          : null,
      entourageEffect: `The combination of ${terpeneNames.slice(0, 3).join(", ")} terpenes creates a synergistic effect profile.`,
      relatedStrains: altMatches.map((a: any) => a.strainName),
    },
    multiImageInfo: {
      imageCountText: `${imageCount} image${imageCount > 1 ? "s" : ""} analyzed`,
    },
    notes: "",
    disclaimer:
      data.disclaimer ||
      "AI-assisted visual analysis. Not a substitute for laboratory testing.",
  };

  return vm as ScannerViewModel;
}

function apiToSynthesis(data: Record<string, any>): WikiSynthesis {
  const identity = data.identity || {};
  const genetics = data.genetics || {};
  const experience = data.experience || {};
  return {
    strain: identity.strainName || "Unknown",
    confidence: Number(identity.confidence) || 60,
    dominance:
      (genetics.dominance as "Indica" | "Sativa" | "Hybrid") || "Hybrid",
    effects: Array.isArray(experience.effects) ? experience.effects : [],
    terpenes: [],
    lineage: Array.isArray(genetics.lineage)
      ? genetics.lineage.join(" × ")
      : "",
  };
}

/* ─── Main entry point ─── */
export async function orchestrateScan(
  images: File[],
  mode: ScanMode = "consumer"
): Promise<OrchestratedScanResult> {
  if (!images || images.length === 0) {
    return buildFallback("No images provided", 0, mode);
  }

  try {
    const base64Images = await Promise.all(images.map(compressImage));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let response: Response;
    try {
      response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images, mode }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr?.name === "AbortError") {
        return buildFallback(
          "Scan timed out — try with fewer photos or better lighting",
          images.length,
          mode
        );
      }
      return buildFallback(
        "Network error — check your connection and try again",
        images.length,
        mode
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      let reason = `status ${response.status}`;
      try {
        const errBody = await response.json();
        if (errBody?.detail?.includes?.("insufficient_quota")) {
          reason = "OpenAI API credits exhausted — contact support";
        } else if (errBody?.detail?.includes?.("rate_limit")) {
          reason = "Too many requests — wait a moment and try again";
        } else if (
          errBody?.detail?.includes?.("image_parse_error") ||
          errBody?.detail?.includes?.("unsupported image")
        ) {
          reason =
            "Image format not supported — try taking a new photo instead of selecting from gallery";
        } else if (errBody?.error) {
          reason = errBody.error;
          if (errBody?.detail)
            reason += ` (${String(errBody.detail).slice(0, 120)})`;
        }
      } catch {
        /* couldn't parse error body */
      }
      console.error("Scan API error:", response.status, reason);
      return buildFallback(`Scan failed: ${reason}`, images.length, mode);
    }

    const data = await response.json();

    if (!data.ok || !data.result) {
      console.error("Scan API returned unexpected response:", data);
      return buildFallback(
        "Scanner returned no result — try again",
        images.length,
        mode
      );
    }

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
      mode,
      fullResult: data.result,
    };
  } catch (error) {
    console.error("orchestrateScan error:", error);
    return buildFallback(
      "Scanner encountered an error",
      images.length,
      mode
    );
  }
}

function buildFallback(
  message: string,
  imageCount: number,
  mode: ScanMode
): OrchestratedScanResult {
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
    primaryMatch: {
      name: "Unknown",
      confidenceRange: { min: 0, max: 0 },
      whyThisMatch: message,
    },
    secondaryMatches: [],
    trustLayer: {
      confidenceBreakdown: {
        visualSimilarity: 0,
        traitOverlap: 0,
        consensusStrength: 0,
      },
      whyThisMatch: [message],
      sourcesUsed: [],
      confidenceLanguage: "Unable to analyze",
    },
    aiWikiBlend: message,
    uncertaintyExplanation: message,
    accuracyTips: [
      "Try uploading clearer images",
      "Use 2-5 photos from different angles",
    ],
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
    synthesis: {
      strain: "Unknown",
      confidence: 0,
      dominance: "Hybrid",
      effects: [],
      terpenes: [],
      lineage: "",
    },
  };

  return {
    displayName: "Analysis Failed",
    confidencePercent: 0,
    confidenceTier: "Low",
    summary: [message],
    rawScannerResult: fallbackVm as ScannerViewModel,
    normalizedScanResult: fallbackResult,
    mode,
    fullResult: {},
  };
}
