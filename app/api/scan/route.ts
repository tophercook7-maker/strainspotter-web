// app/api/scan/route.ts
// StrainSpotter AI Scanner — GPT-4o Vision + strain catalog context
// Node.js runtime: @xenova/transformers + optional fs-backed embedding dataset are not Edge-compatible.

import { NextRequest, NextResponse } from "next/server";
import {
  buildLegacyResultBlob,
  buildUnifiedScanPayload,
} from "@/lib/scanner/rankedScanPipeline";
import {
  buildSystemPrompt,
  buildUserPromptTemplate,
} from "@/lib/scanner/scanPromptBuilder";
import {
  getOpenAIClient,
  loadLocalBackendEnv,
} from "@/backend/services/openaiClient.js";
import { normalizeScanAnalysis } from "@/lib/scanner/scanResponseNormalizer";
import {
  prepareScanInputs,
  buildFusionContext,
  applyConfidenceAdjustments,
} from "@/lib/scanner/scanRouteOrchestrator";
import { convertGptMatchesToCandidates } from "@/lib/scanner/scanFusion";
import {
  fuseHybridScanCandidates,
  type FusedCandidate,
} from "@/lib/scanner/hybridFusion";
import {
  generateMetadataCandidates,
  generateVisualTraitCandidates,
} from "@/lib/scanner/strainMatcher";
import {
  findNearestStrainsFromImages,
  isEmbeddingDatasetAvailable,
  embeddingCandidatesFromDataset,
} from "@/lib/scanner/embeddingService";
import type { RetrievalCandidate, RetrievalSource } from "@/lib/scanner/retrievalTypes";
import { resolveStrainSlug } from "@/lib/scanner/strainSlug";
import type { ScanTier } from "@/lib/scanner/scanEntitlements";
import {
  consumeOneScanForUser,
  entitlementsFromProfileRow,
  getUserFromBearerRequest,
  loadProfileRow,
} from "@/lib/scanner/scanQuotaServer";
import {
  isUsableVisualSignal,
  stripRankedMatchesIfUnusable,
  clampLegacyIdentityConfidenceWhenUnusable,
} from "@/lib/scanner/scanAnalysisSignals";
import { retrieveEmbeddingsIfEligible } from "@/lib/scanner/retrieveEmbeddingsIfEligible";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OPENAI_SCAN_MODEL =
  process.env.OPENAI_SCAN_MODEL ?? "gpt-4o-mini";

const ROUTE = "/api/scan";
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_MAX_IMAGE_MB = 4;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

type ScannerProvider = "openai" | "google" | "off";

function scannerProvider(): ScannerProvider {
  const value = (process.env.SCANNER_AI_PROVIDER ?? "openai").toLowerCase();
  if (value === "google" || value === "off") return value;
  return "openai";
}

function scannerMaxImageBytes(): number {
  const configured = Number(process.env.SCANNER_MAX_IMAGE_MB);
  const mb =
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_MAX_IMAGE_MB;
  return mb * 1024 * 1024;
}

function scannerRateLimitPerMinute(): number {
  const configured = Number(process.env.SCANNER_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_RATE_LIMIT_PER_MINUTE;
}

function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function checkRateLimit(req: NextRequest) {
  const limit = scannerRateLimitPerMinute();
  const now = Date.now();
  const key = requestIp(req);
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true as const, limit, remaining: Math.max(0, limit - 1) };
  }

  if (current.count >= limit) {
    return {
      ok: false as const,
      limit,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  return {
    ok: true as const,
    limit,
    remaining: Math.max(0, limit - current.count),
  };
}

function estimateImageBytes(image: string): number {
  const base64 = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
  const normalized = base64.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function imageByteStats(images: string[]) {
  const sizes = images.map(estimateImageBytes);
  return {
    sizes,
    totalBytes: sizes.reduce((sum, size) => sum + size, 0),
    maxBytes: sizes.length ? Math.max(...sizes) : 0,
  };
}

function logScanUsage(input: {
  provider: ScannerProvider;
  model: string;
  imageBytes?: number;
  imageCount?: number;
  success: boolean;
  stage: string;
  message?: string;
}) {
  console.log({
    timestamp: new Date().toISOString(),
    route: ROUTE,
    provider: input.provider,
    model: input.model,
    imageBytes: input.imageBytes ?? 0,
    imageCount: input.imageCount ?? 0,
    success: input.success,
    stage: input.stage,
    ...(input.message ? { message: input.message } : {}),
  });
}

async function saveScanForTraining(input: {
  userId: string | null;
  scanId: string;
  detectedText: unknown;
  visualTraits: unknown;
  topMatches: Array<{ strainName: string; confidence: number; reasons: string[] }>;
  selectedMatch?: string | null;
  provider: ScannerProvider;
  model: string;
}) {
  if (!input.userId) return;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("scans").insert({
      user_id: input.userId,
      result: {
        schema: "scanner_training_v1",
        scanId: input.scanId,
        image_url: null,
        detectedText:
          typeof input.detectedText === "string" ? input.detectedText : "",
        visualTraits:
          input.visualTraits && typeof input.visualTraits === "object"
            ? input.visualTraits
            : {},
        topMatches: input.topMatches,
        selectedMatch: input.selectedMatch ?? null,
        provider: input.provider,
        model: input.model,
      },
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn({
        route: ROUTE,
        stage: "save_scan_training",
        message: "Scan training save skipped",
        error: error.message,
      });
    }
  } catch (error) {
    console.warn({
      route: ROUTE,
      stage: "save_scan_training",
      message: "Scan training save skipped",
      error: String(error),
    });
  }
}

/** Fused score (0–100) below this triggers “uncertain” handling and honest low confidence. */
const UNCERTAINTY_FUSED_SCORE_THRESHOLD = 40;
/** Embedding channel (0–1) below this is treated as weak evidence for the top match. */
const WEAK_EMBEDDING_EVIDENCE = 0.28;
/** Top-1 vs top-2 fused scores closer than this ⇒ visually ambiguous cluster (purple look-alikes, etc.). */
const TIGHT_FUSED_CLUSTER_GAP = 6.5;
/** If #1 and #2 embedding supports are within this cosine gap, treat as a tight embedding race. */
const TIGHT_EMBEDDING_SIM_GAP = 0.048;

/** Cap rows logged per candidate list to keep server logs readable. */
const MAX_DEBUG_CANDIDATES = 16;

function strainMergeKey(name: string): string {
  return resolveStrainSlug(name) || name.trim().toLowerCase();
}

function bestEmbeddingScoreForStrain(
  strainName: string,
  candidates: RetrievalCandidate[]
): number {
  const key = strainMergeKey(strainName);
  let best = 0;
  for (const c of candidates) {
    if (c.source !== "embedding") continue;
    if (strainMergeKey(c.strainName) !== key) continue;
    best = Math.max(best, Math.max(0, Math.min(1, Number(c.score) || 0)));
  }
  return best;
}

function topTwoFusedScoreGap(fused: FusedCandidate[]): number | null {
  if (fused.length < 2) return null;
  return fused[0]!.score - fused[1]!.score;
}

function tightEmbeddingRaceForTopTwo(
  fused: FusedCandidate[],
  emb: RetrievalCandidate[]
): boolean {
  if (fused.length < 2) return false;
  if (strainMergeKey(fused[0]!.strainName) === strainMergeKey(fused[1]!.strainName)) {
    return false;
  }
  const a = bestEmbeddingScoreForStrain(fused[0]!.strainName, emb);
  const b = bestEmbeddingScoreForStrain(fused[1]!.strainName, emb);
  if (a < 0.17 || b < 0.17) return false;
  return Math.abs(a - b) <= TIGHT_EMBEDDING_SIM_GAP;
}

function detectCloseVisualCluster(
  fused: FusedCandidate[],
  emb: RetrievalCandidate[]
): boolean {
  const gap = topTwoFusedScoreGap(fused);
  const tightFused = gap != null && gap < TIGHT_FUSED_CLUSTER_GAP;
  return tightFused || tightEmbeddingRaceForTopTwo(fused, emb);
}

function sourcesAreGptOnly(sources: RetrievalSource[]): boolean {
  return !sources.includes("embedding");
}

function compactRetrievalCandidatesForLog(c: RetrievalCandidate[]) {
  return c.slice(0, MAX_DEBUG_CANDIDATES).map((x) => ({
    strainName: x.strainName,
    score: Math.round((Number(x.score) || 0) * 1000) / 1000,
    source: x.source,
    reasons: (x.reasons ?? []).slice(0, 2),
  }));
}

function compactFusedCandidatesForLog(c: FusedCandidate[]) {
  return c.slice(0, MAX_DEBUG_CANDIDATES).map((x) => ({
    strainName: x.strainName,
    score: x.score,
    sources: x.sources,
    reasons: (x.reasons ?? []).slice(0, 2),
  }));
}

const SYSTEM_PROMPT = buildSystemPrompt();

type ScanLogMeta = {
  authenticated?: boolean;
  scanTier?: ScanTier;
  canScan?: boolean;
  consumedFrom?: string;
};

function logScanFailure(
  stage: string,
  message: string,
  err?: unknown,
  meta?: ScanLogMeta
) {
  console.error({
    route: ROUTE,
    stage,
    message,
    ...(err !== undefined ? { error: String(err) } : {}),
    ...meta,
  });
}

export async function GET() {
  loadLocalBackendEnv();
  const provider = scannerProvider();
  return NextResponse.json({
    ok: true,
    route: ROUTE,
    provider,
    model: provider === "openai" ? OPENAI_SCAN_MODEL : null,
    maxImageMb: scannerMaxImageBytes() / 1024 / 1024,
    rateLimitPerMinute: scannerRateLimitPerMinute(),
    openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  loadLocalBackendEnv();
  const routeStart = Date.now();
  let openAiMs = 0;
  let embeddingMs = 0;
  const provider = scannerProvider();
  const model = provider === "openai" ? OPENAI_SCAN_MODEL : provider;

  let authenticated = false;
  let scanTier: ScanTier | undefined;
  let canScanBefore: boolean | undefined;
  let authUser: Awaited<ReturnType<typeof getUserFromBearerRequest>> = null;

  try {
    const rateLimit = checkRateLimit(req);
    if (rateLimit.ok === false) {
      logScanUsage({
        provider,
        model,
        success: false,
        stage: "rate_limit",
        message: "Rate limit exceeded",
      });
      return NextResponse.json(
        { error: "Too many scan requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    if (provider === "off") {
      logScanUsage({
        provider,
        model,
        success: false,
        stage: "provider_disabled",
        message: "Scanner AI provider is disabled.",
      });
      return NextResponse.json(
        { error: "Scanner AI provider is disabled." },
        { status: 503 }
      );
    }

    if (provider === "google") {
      logScanUsage({
        provider,
        model,
        success: false,
        stage: "provider_unavailable",
        message: "Google Vision scanner path is not configured.",
      });
      return NextResponse.json(
        { error: "Google Vision scanner path is not configured." },
        { status: 501 }
      );
    }

    const body = await req.json();
    const { images, clientPrepDiagnostics } = body as {
      images?: unknown;
      clientPrepDiagnostics?: { exposureLiftGains?: unknown };
    };

    if (!Array.isArray(images)) {
      logScanFailure("validate_images", "images is not an array");
      return NextResponse.json(
        { error: "Invalid images payload" },
        { status: 400 }
      );
    }
    if (images.some((img) => typeof img !== "string")) {
      logScanFailure("validate_images", "images contains non-string entry");
      return NextResponse.json(
        { error: "Invalid images payload" },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const imageStats = imageByteStats(images);
    const maxImageBytes = scannerMaxImageBytes();
    if (imageStats.maxBytes > maxImageBytes) {
      logScanUsage({
        provider,
        model,
        imageBytes: imageStats.maxBytes,
        imageCount: images.length,
        success: false,
        stage: "image_size",
        message: "Image exceeds configured size limit",
      });
      return NextResponse.json(
        {
          error: `Image exceeds scanner limit of ${Math.round(
            maxImageBytes / 1024 / 1024
          )} MB`,
        },
        { status: 413 }
      );
    }

    authUser = await getUserFromBearerRequest(req);
    authenticated = !!authUser;

    if (authUser) {
      const loaded = await loadProfileRow(authUser.id);
      if (loaded.ok === false) {
        logScanFailure("profile_load", loaded.error, undefined, {
          authenticated: true,
        });
        const status = loaded.error === "Profile not found" ? 404 : 500;
        return NextResponse.json({ error: loaded.error }, { status });
      }

      const ent = entitlementsFromProfileRow(loaded.profile);
      scanTier = ent.tier;
      canScanBefore = ent.canScan;

      if (!ent.canScan) {
        logScanFailure("entitlement_precheck", "Scan limit reached", undefined, {
          authenticated: true,
          scanTier,
          canScan: false,
        });
        return NextResponse.json(
          {
            ok: false,
            error: "Scan limit reached",
            code: "SCAN_LIMIT_REACHED",
            entitlements: ent,
          },
          { status: 403 }
        );
      }
    }

    let openai;
    try {
      openai = getOpenAIClient();
    } catch (configErr) {
      logScanFailure("config", "OpenAI API key not configured", configErr, {
        authenticated,
        ...(scanTier !== undefined ? { scanTier } : {}),
        ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
      });
      logScanUsage({
        provider,
        model,
        imageBytes: imageStats.totalBytes,
        imageCount: images.length,
        success: false,
        stage: "config",
        message: "OpenAI API key not configured",
      });
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing. Run npm run setup:openai or add it to env/.env.local.",
        },
        { status: 500 }
      );
    }

    const preparation = prepareScanInputs(images);

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: string } }
    > = [];

    const SUPPORTED_MIMES = preparation.supportedMimes;

    for (const img of preparation.preparedImages) {
      let dataUrl = img.startsWith("data:")
        ? img
        : `data:image/jpeg;base64,${img}`;

      const mimeMatch = dataUrl.match(/^data:([^;]+);/);
      if (mimeMatch && !SUPPORTED_MIMES.includes(mimeMatch[1])) {
        dataUrl = dataUrl.replace(/^data:[^;]+;/, "data:image/jpeg;");
      }

      content.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "low" },
      });
    }

    content.push({
      type: "text",
      text: buildUserPromptTemplate(images.length),
    });

    const openAiStart = Date.now();
    const openAiAbort = new AbortController();
    const openAiAbortTimer = setTimeout(() => openAiAbort.abort(), 55_000);
    let data: {
      model?: string;
      usage?: unknown;
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    try {
      data = await openai.chat.completions.create(
        {
          model: OPENAI_SCAN_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content },
          ],
          max_tokens: 1600,
          temperature: 0.2,
          response_format: { type: "json_object" },
        },
        { signal: openAiAbort.signal }
      );
    } catch (upstreamErr) {
      clearTimeout(openAiAbortTimer);
      openAiMs = Date.now() - openAiStart;
      const maybeStatus =
        upstreamErr &&
        typeof upstreamErr === "object" &&
        "status" in upstreamErr
          ? Number((upstreamErr as { status?: unknown }).status)
          : undefined;
      const aborted =
        upstreamErr instanceof Error && upstreamErr.name === "AbortError";
      logScanFailure(
        "openai_upstream",
        aborted
          ? "OpenAI request timed out"
          : maybeStatus
            ? `HTTP ${maybeStatus}`
            : "OpenAI request failed",
        upstreamErr,
        {
          authenticated,
          ...(scanTier !== undefined ? { scanTier } : {}),
          ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
        }
      );
      logScanUsage({
        provider,
        model,
        imageBytes: imageStats.totalBytes,
        imageCount: images.length,
        success: false,
        stage: "openai_upstream",
        message: aborted ? "OpenAI request timed out" : "OpenAI request failed",
      });
      return NextResponse.json(
        {
          error: aborted
            ? "AI analysis timed out — try fewer or smaller images"
            : "AI analysis failed (upstream)",
        },
        { status: aborted ? 504 : 502 }
      );
    }
    clearTimeout(openAiAbortTimer);
    openAiMs = Date.now() - openAiStart;
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      logScanFailure("openai_response", "No analysis content in completion", undefined, {
        authenticated,
        ...(scanTier !== undefined ? { scanTier } : {}),
        ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
      });
      logScanUsage({
        provider,
        model,
        imageBytes: imageStats.totalBytes,
        imageCount: images.length,
        success: false,
        stage: "openai_response",
        message: "No analysis content in completion",
      });
      return NextResponse.json(
        { error: "No analysis returned from AI" },
        { status: 502 }
      );
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(analysisText) as Record<string, unknown>;
    } catch (parseErr) {
      logScanFailure("parse_analysis_json", "Failed to parse AI JSON", parseErr, {
        authenticated,
        ...(scanTier !== undefined ? { scanTier } : {}),
        ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
      });
      logScanUsage({
        provider,
        model,
        imageBytes: imageStats.totalBytes,
        imageCount: images.length,
        success: false,
        stage: "parse_analysis_json",
        message: "Failed to parse AI JSON",
      });
      console.error("Failed to parse AI response:", analysisText);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 502 }
      );
    }

    stripRankedMatchesIfUnusable(analysis);
    const usableVisualSignal = isUsableVisualSignal(analysis);

    const fusionContext = buildFusionContext(preparation.quality);

    const datasetReportedAvailable = await isEmbeddingDatasetAvailable();

    let embeddingCandidates: RetrievalCandidate[] = [];
    let embeddingImageCount = 0;
    let embeddingTopStrainMultiImageReinforced = false;
    try {
      const embeddingStart = Date.now();
      const emb = await retrieveEmbeddingsIfEligible(
        usableVisualSignal,
        preparation.preparedImages,
        () => findNearestStrainsFromImages(preparation.preparedImages)
      );
      embeddingCandidates = emb.candidates;
      embeddingImageCount = emb.embeddingImageCount;
      embeddingTopStrainMultiImageReinforced =
        emb.embeddingTopStrainMultiImageReinforced;
      if (usableVisualSignal && preparation.preparedImages.length > 0) {
        embeddingMs = Date.now() - embeddingStart;
      }
    } catch (err) {
      logScanFailure("embedding_pipeline", "Embedding pipeline error", err, {
        authenticated,
        ...(scanTier !== undefined ? { scanTier } : {}),
        ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
      });
    }

    const usedEmbeddingDataset =
      datasetReportedAvailable &&
      embeddingCandidates.length > 0 &&
      embeddingCandidatesFromDataset(embeddingCandidates);

    const rankedMatchesRaw =
      typeof analysis === "object" && analysis !== null
        ? (analysis as Record<string, unknown>).rankedMatches
        : undefined;

    // OpenAI extracts traits only; strain ranking is constrained to local data.
    const gptCandidates = convertGptMatchesToCandidates(rankedMatchesRaw);
    const visualTraitCandidates = generateVisualTraitCandidates(analysis);

    const metadataCandidates = [
      ...visualTraitCandidates,
      ...generateMetadataCandidates(gptCandidates),
    ];

    const fusedCandidates = fuseHybridScanCandidates([
      ...fusionContext.retrievalCandidates,
      ...embeddingCandidates,
      ...metadataCandidates,
      ...gptCandidates,
    ]);

    const closeVisualCluster = detectCloseVisualCluster(
      fusedCandidates,
      embeddingCandidates
    );

    const fusedMatches = fusedCandidates.slice(0, 5).map((c, idx) => {
      const sourceCount = Array.isArray(c.sources) ? c.sources.length : 0;
      let agreementBoost = Math.min(6, Math.max(0, (sourceCount - 1) * 3));

      const rowEmb = bestEmbeddingScoreForStrain(c.strainName, embeddingCandidates);
      if (rowEmb < 0.32) {
        agreementBoost *= 0.55;
      }

      const boostedScore = Math.max(0, Math.min(100, c.score + agreementBoost));

      let adjustedConfidence = applyConfidenceAdjustments(
        boostedScore,
        fusionContext
      );

      if (rowEmb < 0.26) {
        adjustedConfidence = Math.round(adjustedConfidence * 0.84);
      }
      if (sourcesAreGptOnly(c.sources)) {
        adjustedConfidence = Math.min(adjustedConfidence, 58);
      }
      if (fusionContext.quality.qualityPenalty >= 0.2) {
        adjustedConfidence = Math.round(
          adjustedConfidence *
            (1 - 0.12 * fusionContext.quality.qualityPenalty)
        );
      }
      if (c.score < 38) {
        adjustedConfidence = Math.min(adjustedConfidence, 48);
      }
      if (idx === 0 && c.score < UNCERTAINTY_FUSED_SCORE_THRESHOLD) {
        adjustedConfidence = Math.min(adjustedConfidence, 44);
      }

      adjustedConfidence = Math.max(0, Math.min(100, adjustedConfidence));

      const reasons = [...(c.reasons ?? [])];
      if (idx === 0 && closeVisualCluster) {
        adjustedConfidence = Math.round(adjustedConfidence * 0.86);
        adjustedConfidence = Math.max(0, Math.min(100, adjustedConfidence));
        reasons.push(
          "Tight match cluster: several cultivars score similarly (common with purple / dense bud look-alikes). Treat as best-effort, not a definitive ID."
        );
      }
      if (
        idx === 0 &&
        (rowEmb < 0.3 || c.score < UNCERTAINTY_FUSED_SCORE_THRESHOLD)
      ) {
        reasons.push(
          "Low-confidence suggestion: limited similarity to reference images; verify strain by label or lab."
        );
      }

      return {
        strainName: c.strainName,
        confidence: adjustedConfidence,
        reasons,
      };
    });

    const topFusedRow = fusedCandidates[0];
    const topFusedScore = topFusedRow?.score ?? 0;
    const topEmbeddingScore = topFusedRow
      ? bestEmbeddingScoreForStrain(topFusedRow.strainName, embeddingCandidates)
      : 0;
    const usedOnlyGptSupport = topFusedRow
      ? sourcesAreGptOnly(topFusedRow.sources)
      : false;
    const lowConfidenceOutcome =
      topFusedScore < UNCERTAINTY_FUSED_SCORE_THRESHOLD ||
      topEmbeddingScore < WEAK_EMBEDDING_EVIDENCE ||
      (usedOnlyGptSupport && topFusedScore < 56);

    const legacyNormalized = normalizeScanAnalysis(analysis);
    const unifiedPayload = buildUnifiedScanPayload(analysis, images.length);

    if (fusedMatches.length > 0) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - intentional override while keeping legacy contract
      unifiedPayload.matches = fusedMatches;
      const m0 = unifiedPayload.matches[0];
      const m1 = unifiedPayload.matches[1];
      if (lowConfidenceOutcome && m0) {
        const n = m0.strainName;
        unifiedPayload.summary = `Uncertain visual match: ${n}. Treat as a suggestion — similarity signals were weak.`;
      } else if (closeVisualCluster && m0 && m1) {
        unifiedPayload.summary = `Close visual cluster: ${m0.strainName} edged out ${m1.strainName} and similar look-alikes. Best-effort label — confirm with packaging or lab if it matters.`;
      }
    }

    const legacyWithPrimary = buildLegacyResultBlob(
      legacyNormalized as unknown as Record<string, unknown>,
      unifiedPayload.matches
    );

    if (!usableVisualSignal) {
      const id =
        legacyWithPrimary.identity && typeof legacyWithPrimary.identity === "object"
          ? (legacyWithPrimary.identity as Record<string, unknown>)
          : {};
      const prevC = Number(id.confidence);
      legacyWithPrimary.identity = {
        ...id,
        strainName: "No confident match (image unusable)",
        confidence: clampLegacyIdentityConfidenceWhenUnusable(prevC),
        alternateMatches: [],
      };
    }

    const usedFusion = fusedCandidates.length > 0;

    const topMatch = fusedMatches[0];
    const topMatchNames = fusedMatches.slice(0, 5).map((m) => m.strainName);
    const scanId = crypto.randomUUID();

    let consumedFrom: string | undefined;
    if (authUser) {
      const cons = await consumeOneScanForUser(authUser.id);
      if (cons.ok === true) {
        consumedFrom = cons.consumedFrom;
      } else {
        console.warn({
          route: ROUTE,
          stage: "post_scan_consume",
          message: "Consume failed after successful scan (response still returned)",
          authenticated: true,
          ...(scanTier !== undefined ? { scanTier } : {}),
          error: cons.error,
        });
      }
    }

    await saveScanForTraining({
      userId: authUser?.id ?? null,
      scanId,
      detectedText: analysis.detectedText,
      visualTraits: analysis.visualTraits,
      topMatches: fusedMatches,
      selectedMatch: null,
      provider,
      model: data.model ?? OPENAI_SCAN_MODEL,
    });

    console.log({
      timestamp: new Date().toISOString(),
      route: ROUTE,
      provider,
      model: data.model ?? OPENAI_SCAN_MODEL,
      imageBytes: imageStats.totalBytes,
      success: true,
      openAiModel: OPENAI_SCAN_MODEL,
      clientPrepDiagnostics:
        clientPrepDiagnostics &&
        typeof clientPrepDiagnostics === "object" &&
        Array.isArray((clientPrepDiagnostics as { exposureLiftGains?: unknown }).exposureLiftGains)
          ? {
              exposureLiftGains: (
                clientPrepDiagnostics as { exposureLiftGains: unknown[] }
              ).exposureLiftGains.filter((g) => typeof g === "number") as number[],
            }
          : clientPrepDiagnostics ?? null,
      imageCount: preparation.preparedImages.length,
      embeddingImageCount,
      embeddingTopStrainMultiImageReinforced,
      topEmbeddingScore,
      topFusedScore,
      lowConfidenceOutcome,
      closeVisualCluster,
      usedOnlyGptSupport,
      totalMs: Date.now() - routeStart,
      openAiMs,
      embeddingMs,
      usedEmbeddingDataset,
      usedFusion,
      authenticated,
      ...(scanTier !== undefined ? { scanTier } : {}),
      ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
      ...(consumedFrom !== undefined ? { consumedFrom } : {}),
      topMatchName: topMatch?.strainName,
      topMatchConfidence: topMatch?.confidence,
      topMatchNames,
      gptCandidates: compactRetrievalCandidatesForLog(gptCandidates),
      visualTraitCandidates: compactRetrievalCandidatesForLog(visualTraitCandidates),
      metadataCandidates: compactRetrievalCandidatesForLog(metadataCandidates),
      embeddingCandidates: compactRetrievalCandidatesForLog(embeddingCandidates),
      fusedCandidates: compactFusedCandidatesForLog(fusedCandidates),
    });

    return NextResponse.json({
      ok: true,
      scanId,
      status: unifiedPayload.status,
      resultType: unifiedPayload.resultType,
      summary: unifiedPayload.summary,
      matches: unifiedPayload.matches,
      plantAnalysis: unifiedPayload.plantAnalysis,
      growCoach: unifiedPayload.growCoach,
      improveTips: unifiedPayload.improveTips,
      ...(preparation.quality.shouldWarnUser
        ? { scanWarnings: preparation.quality.warnings }
        : {}),
      ...(unifiedPayload.poorImageMessage
        ? { poorImageMessage: unifiedPayload.poorImageMessage }
        : {}),
      result: legacyWithPrimary,
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    const stage =
      error instanceof SyntaxError ? "parse_body" : "handler";
    logScanFailure(stage, String(error), error, {
      authenticated,
      ...(scanTier !== undefined ? { scanTier } : {}),
      ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
    });
    logScanUsage({
      provider,
      model,
      success: false,
      stage,
      message: "Scanner request failed",
    });
    return NextResponse.json(
      { error: "Internal scanner error", detail: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
