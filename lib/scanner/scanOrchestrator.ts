// lib/scanner/scanOrchestrator.ts
// Phase 2 (May 2026): OCR-first, trait-based, multi-candidate scanner orchestration.
//
// Flow:
//   1. Compress + HEIC-convert client-side (heic2any for iPhone, canvas otherwise)
//   2. POST images (and optional sellersClaim) to /api/scan
//   3. Map the v2 schema {observation, traits, likelihood, candidates, summary, claimValidation}
//      onto ScannerViewModel — preserving legacy fields the existing UI reads,
//      and adding v2 fields (candidates, claimValidation, traits, ocrText) for new UI.

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

/* ─── Image compression (unchanged from Phase 1) ─── */

const MAX_DIMENSION = 1536; // GPT-4o "high" detail tiles at 512px — 1536 = 3×3 tiles max
const JPEG_QUALITY = 0.82;

async function blobToJpegDataUrl(blob: Blob): Promise<string> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      let { width, height } = bitmap;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-ctx");
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    } catch {
      /* fall through */
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
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
      if (!ctx) {
        reject(new Error("no-ctx"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img-load"));
    };
    img.src = url;
  });
}

async function compressImage(file: File): Promise<string> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const result = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: JPEG_QUALITY,
      });
      const jpegBlob = Array.isArray(result) ? result[0] : result;
      return blobToJpegDataUrl(jpegBlob);
    } catch (e) {
      console.warn("heic2any conversion failed, falling back to raw:", e);
    }
  }

  try {
    return await blobToJpegDataUrl(file);
  } catch {
    /* fall through */
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── v2 schema → ScannerViewModel mapping ─── */

type V2Candidate = {
  strainName: string;
  slug: string;
  confidence: number;
  matchReasoning: string;
  matchSignals: {
    nameInImage: boolean;
    categoryMatches: boolean;
    visualTraitsMatchPercent: number;
    terpeneFamilyMatches: boolean;
  };
};

type V2ClaimValidation = {
  sellersClaim: string;
  consistent: "yes" | "ambiguous" | "no";
  reasoning: string;
  expectedTraits: string[];
  discrepancies: string[];
};

type V2Result = {
  schemaVersion: "scan-v2";
  observation: {
    ocrText: string;
    ocrStrainCandidates: string[];
    visibleCategory: "indica" | "sativa" | "hybrid" | "unknown";
    categoryConfidence: number;
    imageType:
      | "flower"
      | "packaging"
      | "label"
      | "plant"
      | "other"
      | "unclear";
  };
  traits: {
    budStructure: string;
    trichomeCoverage: "low" | "medium" | "high" | "very-high" | "unknown";
    trichomeColor: "clear" | "cloudy" | "amber" | "mixed" | "unknown";
    pistilColors: string[];
    pistilDensity: "sparse" | "moderate" | "dense" | "unknown";
    coloration: string;
    leafShape: "narrow" | "broad" | "mixed" | "unknown";
    qualityIndicators: string[];
  };
  likelihood: {
    dominantTerpenes: Array<{ name: string; probability: number }>;
    typicalEffectFamily: Array<{ name: string; probability: number }>;
  };
  candidates: V2Candidate[];
  summary: {
    primaryCandidateSlug: string | null;
    confidenceTier: "high" | "moderate" | "low" | "uncertain";
    headline: string;
    advisoryNote: string | null;
  };
  claimValidation: V2ClaimValidation | null;
};

function tierLabelFromV2(tier: V2Result["summary"]["confidenceTier"]): string {
  switch (tier) {
    case "high":
      return "High Confidence";
    case "moderate":
      return "Moderate Confidence";
    case "low":
      return "Low Confidence";
    default:
      return "Uncertain";
  }
}

function dominanceFromCategory(
  cat: V2Result["observation"]["visibleCategory"]
): "Indica" | "Sativa" | "Hybrid" | "Unknown" {
  if (cat === "indica") return "Indica";
  if (cat === "sativa") return "Sativa";
  if (cat === "hybrid") return "Hybrid";
  return "Unknown";
}

function v2ToViewModel(
  data: V2Result,
  imageCount: number
): ScannerViewModel {
  const top = data.candidates[0];
  const strainName = top?.strainName || "Identification Uncertain";
  const confidence = top?.confidence ?? 0;
  const dominance = dominanceFromCategory(data.observation.visibleCategory);
  const tierLabel = tierLabelFromV2(data.summary.confidenceTier);

  const terpeneNames = data.likelihood.dominantTerpenes.map((t) => t.name);
  const effects = data.likelihood.typicalEffectFamily.map((e) => e.name);

  const altCandidates = data.candidates.slice(1, 4);

  // Visual traits — render as a deduped string array (UI-friendly)
  const visualTraits: string[] = [];
  if (data.traits.trichomeCoverage !== "unknown")
    visualTraits.push(`Trichome coverage: ${data.traits.trichomeCoverage}`);
  if (data.traits.trichomeColor !== "unknown")
    visualTraits.push(`Trichome color: ${data.traits.trichomeColor}`);
  if (data.traits.pistilColors.length)
    visualTraits.push(`Pistils: ${data.traits.pistilColors.join("/")}`);
  if (data.traits.pistilDensity !== "unknown")
    visualTraits.push(`Pistil density: ${data.traits.pistilDensity}`);
  if (data.traits.leafShape !== "unknown")
    visualTraits.push(`Leaf shape: ${data.traits.leafShape}`);
  for (const q of data.traits.qualityIndicators) visualTraits.push(q);

  const reasoningWhy = top?.matchReasoning || data.summary.headline;

  // Build the legacy ScannerViewModel shape (everything the existing UI reads),
  // plus tack on v2-native fields for new UI elements.
  const vm: any = {
    /* ── primary identification ── */
    name: strainName,
    title: strainName,
    confidence,

    /* ── name-first display block ── */
    nameFirstDisplay: {
      primaryStrainName: strainName,
      confidencePercent: confidence,
      nameConfidenceTier: tierLabel,
      nameStabilityScore: confidence,
      stabilityExplanation: [reasoningWhy],
      explanation: { whyThisNameWon: [reasoningWhy] },
      alternateMatches: altCandidates.map((c) => ({
        name: c.strainName,
        confidence: c.confidence,
        whyNotPrimary: c.matchReasoning,
      })),
    },

    confidenceTier: { label: tierLabel, numeric: confidence },
    confidenceRange: {
      min: Math.max(0, confidence - 10),
      max: Math.min(100, confidence + 5),
      explanation:
        "Range reflects phenotype variation, image quality, and matching uncertainty.",
    },

    matchBasis: `Visual + label analysis across ${imageCount} image${
      imageCount === 1 ? "" : "s"
    }`,

    /* ── deep analysis sections (legacy, surfaced in old panels) ── */
    visualMatchSummary: data.summary.headline,
    flowerStructureAnalysis: data.traits.budStructure,
    trichomeDensityMaturity: `Coverage: ${data.traits.trichomeCoverage}, color: ${data.traits.trichomeColor}.`,
    leafShapeInternode:
      data.traits.leafShape !== "unknown"
        ? `Leaf shape: ${data.traits.leafShape}.`
        : "Leaf shape not assessable from image.",
    colorPistilIndicators: `${data.traits.coloration}${
      data.traits.pistilColors.length
        ? ` Pistils: ${data.traits.pistilColors.join(", ")}.`
        : ""
    }`,
    growthPatternClues: data.traits.qualityIndicators.join("; "),

    primaryMatch: {
      name: strainName,
      confidenceRange: {
        min: Math.max(0, confidence - 10),
        max: Math.min(100, confidence + 5),
      },
      whyThisMatch: reasoningWhy,
    },

    secondaryMatches: altCandidates.map((c) => ({
      name: c.strainName,
      whyNotPrimary: c.matchReasoning,
    })),

    trustLayer: {
      confidenceBreakdown: {
        visualSimilarity: top?.matchSignals.visualTraitsMatchPercent ?? 0,
        traitOverlap: top?.matchSignals.visualTraitsMatchPercent ?? 0,
        consensusStrength:
          imageCount > 1 ? confidence : Math.max(0, confidence - 10),
      },
      whyThisMatch: [reasoningWhy],
      sourcesUsed: ["GPT-4o Vision", "StrainSpotter Catalog"],
      confidenceLanguage:
        confidence >= 80
          ? "Strong match — visible label and trait alignment"
          : confidence >= 60
            ? "Moderate match — multiple supporting signals"
            : "Low confidence — visual evidence inconclusive",
    },

    aiWikiBlend: data.summary.headline,
    uncertaintyExplanation:
      data.summary.advisoryNote ||
      "Visual identification has inherent limits without lab analysis.",
    accuracyTips: [
      "Photograph any visible label or packaging",
      "Use 2–4 images from different angles",
      "Ensure good lighting, especially on trichomes",
      "Avoid heavy shadows or motion blur",
    ],

    /* ── genetics / morphology / chemistry / experience ── */
    genetics: {
      dominance,
      lineage: "Unknown lineage",
      breederNotes: "",
    },

    morphology: data.traits.budStructure,
    trichomes: `Coverage: ${data.traits.trichomeCoverage}, color: ${data.traits.trichomeColor}`,
    pistils: data.traits.pistilColors.join(", "),
    structure: data.traits.budStructure,
    growthTraits: visualTraits,
    terpeneGuess: terpeneNames,
    effectsShort: effects.slice(0, 3),
    effectsLong: effects,
    referenceStrains: altCandidates.map((c) => c.strainName),
    sources: ["GPT-4o Vision Analysis"],

    chemistry: {
      terpenes: data.likelihood.dominantTerpenes.map((t) => ({
        name: t.name,
        confidence: t.probability,
      })),
      cannabinoids: { THC: "typical range", CBD: "typical range" },
      cannabinoidRange: "Varies by phenotype and grow conditions",
      likelyTerpenes: data.likelihood.dominantTerpenes
        .slice(0, 3)
        .map((t) => ({ name: t.name, confidence: t.probability })),
    },

    experience: {
      effects,
      primaryEffects: effects.slice(0, 2),
      secondaryEffects: effects.slice(2),
      onset: "Variable",
      duration: "Variable",
      bestUse: [],
    },

    cultivation: {
      difficulty: "Variable",
      floweringTime: "Variable",
      yield: "Variable",
      notes: "",
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
      confidence: data.observation.categoryConfidence,
      explanation: [`Category inferred from visual evidence (${dominance}).`],
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
          : "Terpene profile not assessable from image",
      aromaDescription:
        "Inferred from visual trichome and coloration cues, not direct scent.",
      experienceNarrative:
        effects.length > 0
          ? `Users commonly report ${effects.slice(0, 2).join(" and ")} when consuming ${dominance.toLowerCase()}-leaning cultivars with these traits.`
          : `${dominance} category. Effect profile uncertain from visual evidence alone.`,
      terpeneBreakdown: data.likelihood.dominantTerpenes.map((t) => ({
        name: t.name,
        percentage: Math.round(t.probability * 30),
        effect: `Often associated with the ${t.name} aromatic family.`,
      })),
    },

    extendedProfile: {
      originStory: "",
      familyTree: null,
      entourageEffect:
        terpeneNames.length > 0
          ? `Likely terpene mix: ${terpeneNames.slice(0, 3).join(", ")}.`
          : "Terpene profile uncertain.",
      relatedStrains: altCandidates.map((c) => c.strainName),
    },

    multiImageInfo: {
      imageCountText: `${imageCount} image${imageCount === 1 ? "" : "s"} analyzed`,
    },

    notes: "",
    disclaimer:
      "AI-assisted visual analysis. Effects vary by individual; not medical advice or a substitute for laboratory testing.",

    /* ── Apple-safe: medical fields removed ── */
    medicalRaw: {},
    growerRaw: {},
    breederRaw: {},
    dispensaryRaw: {},
    engagementRaw: {},

    /* ── v2-native fields (new UI components read these) ── */
    v2: {
      observation: data.observation,
      traits: data.traits,
      likelihood: data.likelihood,
      candidates: data.candidates,
      summary: data.summary,
      claimValidation: data.claimValidation,
    },
  };

  return vm as ScannerViewModel;
}

function v2ToSynthesis(data: V2Result): WikiSynthesis {
  const top = data.candidates[0];
  return {
    strain: top?.strainName || "Unknown",
    confidence: top?.confidence ?? 0,
    dominance: dominanceFromCategory(data.observation.visibleCategory) as
      | "Indica"
      | "Sativa"
      | "Hybrid",
    effects: data.likelihood.typicalEffectFamily.map((e) => e.name),
    terpenes: data.likelihood.dominantTerpenes.map((t) => t.name),
    lineage: "",
  } as unknown as WikiSynthesis;
}

/* ─── Public entry point ─── */

/**
 * Thrown when the scan API responds with 401 (auth required) or 402
 * (subscription required) — the caller should treat this as a UI signal
 * to show the paywall, not a generic scan failure.
 */
export class ScanSubscriptionRequiredError extends Error {
  status: 401 | 402;
  constructor(status: 401 | 402, message: string) {
    super(message);
    this.name = "ScanSubscriptionRequiredError";
    this.status = status;
  }
}

export async function orchestrateScan(
  images: File[],
  options?: { authToken?: string; sellersClaim?: string }
): Promise<OrchestratedScanResult> {
  if (!images || images.length === 0) {
    return buildFallback("No images provided", 0);
  }

  try {
    const base64Images = await Promise.all(images.map(compressImage));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options?.authToken) {
      headers["Authorization"] = `Bearer ${options.authToken}`;
    }

    const requestBody: { images: string[]; sellersClaim?: string } = {
      images: base64Images,
    };
    if (options?.sellersClaim?.trim()) {
      requestBody.sellersClaim = options.sellersClaim.trim();
    }

    let response: Response;
    try {
      response = await fetch("/api/scan", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr?.name === "AbortError") {
        return buildFallback(
          "Scan timed out — try fewer photos or better lighting",
          images.length
        );
      }
      return buildFallback(
        "Network error — check your connection and try again",
        images.length
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      // Auth / subscription failures bubble up as a typed error so the UI
      // can pop the paywall instead of a generic 'scan failed' card.
      if (response.status === 401 || response.status === 402) {
        let msg =
          response.status === 402
            ? "Active subscription required."
            : "Sign in to continue.";
        try {
          const body = await response.json();
          if (typeof body?.error === "string" && body.error.trim()) {
            msg = body.error;
          }
        } catch { /* ignore */ }
        throw new ScanSubscriptionRequiredError(
          response.status as 401 | 402,
          msg
        );
      }
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
            "Image format not supported — try a fresh photo from your camera";
        } else if (errBody?.error) {
          reason = errBody.error;
          if (errBody?.detail)
            reason += ` (${String(errBody.detail).slice(0, 120)})`;
        }
      } catch {
        /* couldn't parse */
      }
      console.error("Scan API error:", response.status, reason);
      return buildFallback(`Scan failed: ${reason}`, images.length);
    }

    const data = await response.json();
    if (!data.ok || !data.result) {
      console.error("Scan API returned unexpected response:", data);
      return buildFallback(
        "Scanner returned no result — try again",
        images.length
      );
    }

    const v2: V2Result = data.result;
    const viewModel = v2ToViewModel(v2, images.length);
    const synthesis = v2ToSynthesis(v2);

    const confidence = viewModel.confidence;
    let tier: "Low" | "Medium" | "High" | "Very High" = "Low";
    if (confidence >= 90) tier = "Very High";
    else if (confidence >= 80) tier = "High";
    else if (confidence >= 60) tier = "Medium";

    const summary: string[] = [v2.summary.headline];
    if (v2.summary.advisoryNote) summary.push(v2.summary.advisoryNote);

    const warnings: string[] = [];
    if (
      v2.observation.imageType === "unclear" ||
      v2.observation.imageType === "other"
    ) {
      warnings.push(
        "Image content unclear — results may not reflect cannabis flower."
      );
    }
    if (confidence < 30) {
      warnings.push(
        "Low confidence: try retaking the photo with better lighting and any visible label."
      );
    }

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
      } as unknown as import("./types").ScanMeta,
    };

    return {
      displayName: viewModel.name,
      confidencePercent: confidence,
      confidenceTier: tier,
      summary,
      warnings: warnings.length ? warnings : undefined,
      rawScannerResult: viewModel,
      normalizedScanResult: scanResult,
    };
  } catch (error: any) {
    if (error instanceof ScanSubscriptionRequiredError) {
      // Re-throw so the calling component can react (open paywall).
      throw error;
    }
    console.error("orchestrateScan error:", error);
    return buildFallback("Scanner encountered an error", images.length);
  }
}

/* ─── Fallback (network / API failure) ─── */

function buildFallback(
  message: string,
  imageCount: number
): OrchestratedScanResult {
  const fallbackVm: any = {
    name: "Analysis Failed",
    title: "Analysis Failed",
    confidence: 0,
    nameFirstDisplay: {
      primaryStrainName: "Analysis Failed",
      confidencePercent: 0,
      nameConfidenceTier: "Uncertain",
    },
    confidenceTier: { label: "Uncertain", numeric: 0 },
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
      "Use 2–4 photos from different angles",
      "Photograph any visible label or packaging",
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
    medicalRaw: {},
    growerRaw: {},
    breederRaw: {},
    dispensaryRaw: {},
    engagementRaw: {},
    v2: null,
  };

  const fallbackResult: ScanResult = {
    status: "partial",
    guard: { status: "low-confidence", reason: message },
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
    } as unknown as WikiSynthesis,
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
