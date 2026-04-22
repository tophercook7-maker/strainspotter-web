// lib/scanner/scanOrchestrator.ts
// REWRITE: Call /api/scan directly, bypass bloated pipeline
// Maps GPT-4o Vision response → ScannerViewModel → ScanResult

import { apiUrl } from "@/lib/config/apiBase";
import type { ScannerViewModel } from "./viewModel";
import type { ScanResult, WikiSynthesis } from "./types";
import {
  computeCenterAspectCrop,
  scaleToMaxDimension,
  SCANNER_JPEG_MAX_EDGE,
} from "@/lib/scanner/scannerImageGeometry";

/** Top-level `/api/scan` fields (hybrid pipeline) for UI — does not replace legacy `result`. */
export interface HybridScanPresentation {
  matches?: Array<{ strainName: string; confidence: number; reasons?: string[] }>;
  plantAnalysis?: unknown;
  growCoach?: unknown;
  improveTips?: string[];
  poorImageMessage?: string;
  scanWarnings?: string[];
}

function extractHybridPresentation(
  data: Record<string, unknown>
): HybridScanPresentation | undefined {
  const matchesRaw = data.matches;
  const matches = Array.isArray(matchesRaw)
    ? matchesRaw
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const o = m as Record<string, unknown>;
          const strainName =
            typeof o.strainName === "string" ? o.strainName.trim() : "";
          const confidence = Number(o.confidence);
          if (!strainName || !Number.isFinite(confidence)) return null;
          const reasons = Array.isArray(o.reasons)
            ? o.reasons.filter((r): r is string => typeof r === "string")
            : undefined;
          return { strainName, confidence, reasons };
        })
        .filter((x) => x !== null) as HybridScanPresentation["matches"]
    : undefined;

  const improveTips = Array.isArray(data.improveTips)
    ? data.improveTips.filter((t): t is string => typeof t === "string")
    : undefined;

  const scanWarnings = Array.isArray(data.scanWarnings)
    ? data.scanWarnings.filter((t): t is string => typeof t === "string")
    : undefined;

  const poorImageMessage =
    typeof data.poorImageMessage === "string" && data.poorImageMessage.trim()
      ? data.poorImageMessage.trim()
      : undefined;

  const has =
    (matches && matches.length > 0) ||
    data.plantAnalysis != null ||
    data.growCoach != null ||
    (improveTips && improveTips.length > 0) ||
    poorImageMessage ||
    (scanWarnings && scanWarnings.length > 0);

  if (!has) return undefined;

  return {
    ...(matches && matches.length > 0 ? { matches } : {}),
    ...(data.plantAnalysis != null ? { plantAnalysis: data.plantAnalysis } : {}),
    ...(data.growCoach != null ? { growCoach: data.growCoach } : {}),
    ...(improveTips && improveTips.length > 0 ? { improveTips } : {}),
    ...(poorImageMessage ? { poorImageMessage } : {}),
    ...(scanWarnings && scanWarnings.length > 0 ? { scanWarnings } : {}),
  };
}

/** Top-level `/api/scan` `status` / `resultType` for optional client messaging (additive). */
export interface ScanPayloadUiFlags {
  status?: "ok" | "needs_better_images";
  resultType?: "matched" | "unresolved";
}

function extractApiScanSummary(data: Record<string, unknown>): string | undefined {
  const s = data.summary;
  if (typeof s === "string" && s.trim()) return s.trim();
  return undefined;
}

function extractScanPayloadFlags(
  data: Record<string, unknown>
): ScanPayloadUiFlags | undefined {
  const status = data.status;
  const resultType = data.resultType;
  const out: ScanPayloadUiFlags = {};
  if (status === "ok" || status === "needs_better_images") {
    out.status = status;
  }
  if (resultType === "matched" || resultType === "unresolved") {
    out.resultType = resultType;
  }
  return out.status !== undefined || out.resultType !== undefined
    ? out
    : undefined;
}

export interface OrchestratedScanResult {
  displayName: string;
  confidencePercent: number;
  confidenceTier: "Low" | "Medium" | "High" | "Very High";
  summary: string[];
  /** Top-level `summary` string from `/api/scan` (hybrid pipeline narrative). */
  apiScanSummary?: string;
  warnings?: string[];
  rawScannerResult: ScannerViewModel;
  normalizedScanResult: ScanResult;
  /** Present when the API returned hybrid / unified fields alongside `result`. */
  hybridPresentation?: HybridScanPresentation;
  /** Top-level scan payload hints from `/api/scan` (optional). */
  scanPayloadFlags?: ScanPayloadUiFlags;
}

/* ─── Image compression ─── */
const MAX_DIMENSION = SCANNER_JPEG_MAX_EDGE; // GPT-4o "high" detail tiles at 512px — 1536 = 3×3 tiles max
const JPEG_QUALITY  = 0.86;  // Slightly higher than 0.82 to preserve trichome edges after resize

const EXPOSURE_GAIN_MAX = 1.5;
/** Skip lift when sampled mean luminance exceeds this (0–255). */
const EXPOSURE_MEAN_SKIP_ABOVE = 80;
const EXPOSURE_BRIGHT_SKIP_AT_OR_ABOVE = 210;

export interface ImageCompressResult {
  dataUrl: string;
  /** Multiplicative gain applied on the canvas (1 = none). Logged with `/api/scan` for debugging. */
  exposureGain: number;
}

/**
 * Gentle exposure lift for very dark frames. Gain capped at {@link EXPOSURE_GAIN_MAX};
 * not applied when mean luminance > {@link EXPOSURE_MEAN_SKIP_ABOVE}/255.
 * @returns Applied multiplicative gain (>= 1).
 */
function liftDarkExposure(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  if (w <= 0 || h <= 0) return 1;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let sum = 0;
  const stride = 32;
  let n = 0;
  for (let i = 0; i < d.length; i += stride) {
    sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    n++;
  }
  const avg = n ? sum / n : 128;
  if (avg > EXPOSURE_MEAN_SKIP_ABOVE || avg >= EXPOSURE_BRIGHT_SKIP_AT_OR_ABOVE) return 1;

  const raw = 48 / Math.max(10, avg);
  const gain = Math.min(EXPOSURE_GAIN_MAX, raw);
  if (gain <= 1.01) return 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * gain);
    d[i + 1] = Math.min(255, d[i + 1] * gain);
    d[i + 2] = Math.min(255, d[i + 2] * gain);
  }
  ctx.putImageData(img, 0, 0);
  return gain;
}

/** Compress a Blob/File that the browser can already decode via canvas → JPEG data-URL */
async function blobToJpegDataUrl(blob: Blob): Promise<ImageCompressResult> {
  // Try createImageBitmap first (no blob URL needed, avoids iframe security issues)
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      const crop = computeCenterAspectCrop(bitmap.width, bitmap.height);
      const { outW, outH } = scaleToMaxDimension(crop.cw, crop.ch);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-ctx");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        bitmap,
        crop.sx,
        crop.sy,
        crop.cw,
        crop.ch,
        0,
        0,
        outW,
        outH
      );
      const exposureGain = liftDarkExposure(ctx, outW, outH);
      bitmap.close();
      return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), exposureGain };
    } catch { /* fall through */ }
  }

  // Fallback: Image element + blob URL
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const crop = computeCenterAspectCrop(iw, ih);
      const { outW, outH } = scaleToMaxDimension(crop.cw, crop.ch);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no-ctx")); return; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        crop.sx,
        crop.sy,
        crop.cw,
        crop.ch,
        0,
        0,
        outW,
        outH
      );
      const exposureGain = liftDarkExposure(ctx, outW, outH);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), exposureGain });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img-load")); };
    img.src = url;
  });
}

/**
 * Resize + compress an image file to a JPEG data-URL.
 *
 * HEIC/HEIF are first converted via heic2any (pure-JS, works in all browsers).
 * Other formats go through canvas compression.
 * Raw data-URL is the last resort so the API's error handler can surface a helpful message.
 */
async function compressImage(file: File): Promise<ImageCompressResult> {
  const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
                 file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");

  // ── HEIC/HEIF: convert with heic2any (pure JS, browser-compatible) ────────
  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const result = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
      const jpegBlob = Array.isArray(result) ? result[0] : result;
      return await blobToJpegDataUrl(jpegBlob);
    } catch (e) {
      console.warn("heic2any conversion failed, falling back to raw:", e);
      // Fall through to raw as last resort
    }
  }

  // ── Standard formats: canvas compression ─────────────────────────────────
  try {
    return await blobToJpegDataUrl(file);
  } catch { /* fall through */ }

  // ── Last resort: send raw bytes; API error handler surfaces friendly message
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ dataUrl: reader.result as string, exposureGain: 1 });
    reader.onerror = reject;
    reader.readAsDataURL(file);
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
  /** Use server-fused 0–100 score as-is (`buildLegacyResultBlob` patches identity from hybrid matches). */
  const rawIdentityConfidence = Number(identity.confidence);
  const confidence = Number.isFinite(rawIdentityConfidence)
    ? Math.max(0, Math.min(100, rawIdentityConfidence))
    : 0;
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
      min: Math.max(0, confidence - 10),
      max: Math.min(100, confidence + 5),
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
      confidenceRange: {
        min: Math.max(0, confidence - 10),
        max: Math.min(100, confidence + 5),
      },
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
        traitOverlap: Math.max(0, confidence - 5),
        consensusStrength: imageCount > 1 ? confidence : Math.max(0, confidence - 10),
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

    // Pass through raw professional data from GPT response
    medicalRaw: data.medical || {},
    growerRaw: data.grower || {},
    breederRaw: data.breeder || {},
    dispensaryRaw: data.dispensary || {},
    engagementRaw: data.engagement || {},
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

  const synC = Number(identity.confidence);
  return {
    strain: identity.strainName || "Unknown",
    confidence: Number.isFinite(synC) ? Math.max(0, Math.min(100, synC)) : 0,
    dominance: (genetics.dominance as "Indica" | "Sativa" | "Hybrid") || "Hybrid",
    effects: Array.isArray(experience.effects) ? experience.effects : [],
    terpenes: [],
    lineage: Array.isArray(genetics.lineage) ? genetics.lineage.join(" × ") : "",
  } as unknown as WikiSynthesis;
}

export async function orchestrateScan(images: File[], authToken?: string): Promise<OrchestratedScanResult> {
  if (!images || images.length === 0) {
    return buildFallback("No images provided", 0);
  }

  try {
    // 1. Compress & convert all images (resize to 1536px max, JPEG)
    const packed = await Promise.all(images.map((f) => compressImage(f)));
    const base64Images = packed.map((p) => p.dataUrl);
    const exposureLiftGains = packed.map((p) => p.exposureGain);

    // 2. Call /api/scan directly (45s timeout for GPT-4o Vision)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(apiUrl("/api/scan"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          images: base64Images,
          clientPrepDiagnostics: { exposureLiftGains },
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr?.name === "AbortError") {
        return buildFallback("Scan timed out — try with fewer photos or better lighting", images.length);
      }
      return buildFallback("Network error — check your connection and try again", images.length);
    }
    clearTimeout(timeout);

    if (!response.ok) {
      let reason = `status ${response.status}`;
      try {
        const errBody = await response.json();
        if (response.status === 403 && errBody?.code === "SCAN_LIMIT_REACHED") {
          reason =
            typeof errBody.error === "string"
              ? errBody.error
              : "Scan limit reached for your account";
        } else if (errBody?.detail?.includes?.("insufficient_quota")) {
          reason = "OpenAI API credits exhausted — contact support";
        } else if (errBody?.detail?.includes?.("rate_limit")) {
          reason = "Too many requests — wait a moment and try again";
        } else if (errBody?.detail?.includes?.("image_parse_error") || errBody?.detail?.includes?.("unsupported image")) {
          reason = "Image format not supported — try taking a new photo instead of selecting from gallery";
        } else if (response.status === 504) {
          reason =
            typeof errBody.error === "string"
              ? errBody.error
              : "Scan timed out on the server — try fewer or smaller images";
        } else if (errBody?.error) {
          reason = errBody.error;
          if (errBody?.detail) reason += ` (${String(errBody.detail).slice(0, 120)})`;
        }
      } catch { /* couldn't parse error body */ }
      console.error("Scan API error:", response.status, reason);
      return buildFallback(`Scan failed: ${reason}`, images.length);
    }

    const data = await response.json();

    if (!data.ok || !data.result) {
      console.error("Scan API returned unexpected response:", data);
      return buildFallback("Scanner returned no result — try again", images.length);
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
      } as unknown as import("./types").ScanMeta,
    };

    return {
      displayName: viewModel.name,
      confidencePercent: confidence,
      confidenceTier: tier,
      summary: [viewModel.visualMatchSummary],
      apiScanSummary: extractApiScanSummary(data as Record<string, unknown>),
      rawScannerResult: viewModel,
      normalizedScanResult: scanResult,
      hybridPresentation: extractHybridPresentation(data as Record<string, unknown>),
      scanPayloadFlags: extractScanPayloadFlags(data as Record<string, unknown>),
    };
  } catch (error: any) {
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
    guard: { status: "low-confidence", reason: "Analysis could not be completed" },
    consensus: {} as any,
    confidence: 0,
    result: fallbackVm as ScannerViewModel,
    synthesis: { strain: "Unknown", confidence: 0, dominance: "Hybrid", effects: [], terpenes: [], lineage: "" } as unknown as WikiSynthesis,
  };

  return {
    displayName: "Analysis Failed",
    confidencePercent: 0,
    confidenceTier: "Low",
    summary: [message],
    apiScanSummary: undefined,
    rawScannerResult: fallbackVm as ScannerViewModel,
    normalizedScanResult: fallbackResult,
    hybridPresentation: undefined,
    scanPayloadFlags: undefined,
  };
}
