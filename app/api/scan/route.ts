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
import { generateMetadataCandidates } from "@/lib/scanner/strainMatcher";
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

export const runtime = "nodejs";

const OPENAI_SCAN_MODEL =
  process.env.OPENAI_SCAN_MODEL ?? "gpt-4o-2024-11-20";

/*
 * TODO: Production hardening (not implemented here):
 * - Rate limiting (per IP / per user / token bucket) to cap cost and abuse
 * - Bot / automation signals (User-Agent, Turnstile, etc.) if exposing anonymously
 */

const ROUTE = "/api/scan";

/** Fused score (0–100) below this triggers “uncertain” handling and honest low confidence. */
const UNCERTAINTY_FUSED_SCORE_THRESHOLD = 40;
/** Embedding channel (0–1) below this is treated as weak evidence for the top match. */
const WEAK_EMBEDDING_EVIDENCE = 0.28;

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

export async function POST(req: NextRequest) {
  const routeStart = Date.now();
  let openAiMs = 0;
  let embeddingMs = 0;

  let authenticated = false;
  let scanTier: ScanTier | undefined;
  let canScanBefore: boolean | undefined;
  let authUser: Awaited<ReturnType<typeof getUserFromBearerRequest>> = null;

  try {
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logScanFailure("config", "OpenAI API key not configured", undefined, {
        authenticated,
        ...(scanTier !== undefined ? { scanTier } : {}),
        ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
      });
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
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
        image_url: { url: dataUrl, detail: "high" },
      });
    }

    content.push({
      type: "text",
      text: buildUserPromptTemplate(images.length),
    });

    const openAiStart = Date.now();
    const openAiAbort = new AbortController();
    const openAiAbortTimer = setTimeout(() => openAiAbort.abort(), 55_000);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_SCAN_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content },
          ],
          max_tokens: 4096,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        signal: openAiAbort.signal,
      });
    } catch (upstreamErr) {
      clearTimeout(openAiAbortTimer);
      openAiMs = Date.now() - openAiStart;
      const aborted =
        upstreamErr instanceof Error && upstreamErr.name === "AbortError";
      logScanFailure(
        "openai_upstream",
        aborted ? "OpenAI request timed out" : "OpenAI fetch failed",
        upstreamErr,
        {
          authenticated,
          ...(scanTier !== undefined ? { scanTier } : {}),
          ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
        }
      );
      return NextResponse.json(
        {
          error: aborted
            ? "AI analysis timed out — try fewer or smaller images"
            : "AI analysis failed (network)",
        },
        { status: 504 }
      );
    }
    clearTimeout(openAiAbortTimer);

    if (!response.ok) {
      const errorText = await response.text();
      openAiMs = Date.now() - openAiStart;
      logScanFailure(
        "openai_upstream",
        `HTTP ${response.status}`,
        errorText.slice(0, 500),
        {
          authenticated,
          ...(scanTier !== undefined ? { scanTier } : {}),
          ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
        }
      );
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `AI analysis failed (upstream ${response.status})`,
          detail: errorText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    openAiMs = Date.now() - openAiStart;
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      logScanFailure("openai_response", "No analysis content in completion", undefined, {
        authenticated,
        ...(scanTier !== undefined ? { scanTier } : {}),
        ...(canScanBefore !== undefined ? { canScan: canScanBefore } : {}),
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

    const gptCandidates = convertGptMatchesToCandidates(rankedMatchesRaw);

    const metadataCandidates = generateMetadataCandidates(gptCandidates);

    const fusedCandidates = fuseHybridScanCandidates([
      ...fusionContext.retrievalCandidates,
      ...embeddingCandidates,
      ...metadataCandidates,
      ...gptCandidates,
    ]);

    const fusedMatches = fusedCandidates.slice(0, 3).map((c, idx) => {
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
      if (lowConfidenceOutcome && unifiedPayload.matches[0]) {
        const n = unifiedPayload.matches[0].strainName;
        unifiedPayload.summary = `Uncertain visual match: ${n}. Treat as a suggestion — similarity signals were weak.`;
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
    const top3MatchNames = fusedMatches.slice(0, 3).map((m) => m.strainName);

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

    console.log({
      route: ROUTE,
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
      top3MatchNames,
      gptCandidates: compactRetrievalCandidatesForLog(gptCandidates),
      metadataCandidates: compactRetrievalCandidatesForLog(metadataCandidates),
      embeddingCandidates: compactRetrievalCandidatesForLog(embeddingCandidates),
      fusedCandidates: compactFusedCandidatesForLog(fusedCandidates),
    });

    return NextResponse.json({
      ok: true,
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
    return NextResponse.json(
      { error: "Internal scanner error", detail: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
