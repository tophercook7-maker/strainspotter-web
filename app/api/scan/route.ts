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
import { fuseHybridScanCandidates } from "@/lib/scanner/hybridFusion";
import { generateMetadataCandidates } from "@/lib/scanner/strainMatcher";
import {
  getImageEmbedding,
  findNearestStrainsFromDataset,
  isEmbeddingDatasetAvailable,
  embeddingCandidatesFromDataset,
} from "@/lib/scanner/embeddingService";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

export const runtime = "nodejs";

/*
 * TODO: Production hardening (not implemented here):
 * - Rate limiting (per IP / per user / token bucket) to cap cost and abuse
 * - Auth: require session, membership, or signed API key before heavy work
 * - Bot / automation signals (User-Agent, Turnstile, etc.) if exposing anonymously
 */

const ROUTE = "/api/scan";

const SYSTEM_PROMPT = buildSystemPrompt();

function logScanFailure(stage: string, message: string, err?: unknown) {
  console.error({
    route: ROUTE,
    stage,
    message,
    ...(err !== undefined ? { error: String(err) } : {}),
  });
}

export async function POST(req: NextRequest) {
  const routeStart = Date.now();
  let openAiMs = 0;
  let embeddingMs = 0;

  try {
    const body = await req.json();
    const { images } = body as { images?: unknown };

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logScanFailure("config", "OpenAI API key not configured");
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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      openAiMs = Date.now() - openAiStart;
      logScanFailure(
        "openai_upstream",
        `HTTP ${response.status}`,
        errorText.slice(0, 500)
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
      logScanFailure("openai_response", "No analysis content in completion");
      return NextResponse.json(
        { error: "No analysis returned from AI" },
        { status: 502 }
      );
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(analysisText) as Record<string, unknown>;
    } catch (parseErr) {
      logScanFailure("parse_analysis_json", "Failed to parse AI JSON", parseErr);
      console.error("Failed to parse AI response:", analysisText);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 502 }
      );
    }

    const fusionContext = buildFusionContext(preparation.quality);

    const datasetReportedAvailable = await isEmbeddingDatasetAvailable();

    let embeddingCandidates: RetrievalCandidate[] = [];
    try {
      if (preparation.preparedImages.length > 0) {
        const embeddingStart = Date.now();
        const embedding = await getImageEmbedding(
          preparation.preparedImages[0]
        );
        embeddingCandidates = await findNearestStrainsFromDataset(embedding);
        embeddingMs = Date.now() - embeddingStart;
      }
    } catch (err) {
      logScanFailure("embedding_pipeline", "Embedding pipeline error", err);
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

    const fusedMatches = fusedCandidates.slice(0, 3).map((c) => {
      const sourceCount = Array.isArray(c.sources) ? c.sources.length : 0;
      // Modest post-fusion nudge; hybridFusion already encodes cross-source agreement.
      const agreementBoost = Math.min(6, Math.max(0, (sourceCount - 1) * 3));

      const boostedScore = Math.max(0, Math.min(100, c.score + agreementBoost));

      const adjustedConfidence = applyConfidenceAdjustments(
        boostedScore,
        fusionContext
      );

      return {
        strainName: c.strainName,
        confidence: Math.max(0, Math.min(100, adjustedConfidence)),
        reasons: c.reasons,
      };
    });

    const legacyNormalized = normalizeScanAnalysis(analysis);
    const unifiedPayload = buildUnifiedScanPayload(analysis, images.length);

    if (fusedMatches.length > 0) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - intentional override while keeping legacy contract
      unifiedPayload.matches = fusedMatches;
    }

    const legacyWithPrimary = buildLegacyResultBlob(
      legacyNormalized as unknown as Record<string, unknown>,
      unifiedPayload.matches
    );

    const usedFusion = fusedCandidates.length > 0;

    const topMatch = fusedMatches[0];
    const top3MatchNames = fusedMatches.slice(0, 3).map((m) => m.strainName);

    console.log({
      route: ROUTE,
      imageCount: preparation.preparedImages.length,
      totalMs: Date.now() - routeStart,
      openAiMs,
      embeddingMs,
      usedEmbeddingDataset,
      usedFusion,
      topMatchName: topMatch?.strainName,
      topMatchConfidence: topMatch?.confidence,
      top3MatchNames,
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
    logScanFailure(stage, String(error), error);
    return NextResponse.json(
      { error: "Internal scanner error", detail: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
