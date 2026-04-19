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
} from "@/lib/scanner/scanOrchestrator";
import { convertGptMatchesToCandidates } from "@/lib/scanner/scanFusion";
import { fuseHybridScanCandidates } from "@/lib/scanner/hybridFusion";
import { generateMetadataCandidates } from "@/lib/scanner/strainMatcher";
import {
  getImageEmbedding,
  findNearestStrainsFromDataset,
} from "@/lib/scanner/embeddingService";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

export const runtime = "nodejs";

const SYSTEM_PROMPT = buildSystemPrompt();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images } = body as { images: string[] };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
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
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      return NextResponse.json(
        { error: "No analysis returned from AI" },
        { status: 502 }
      );
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(analysisText) as Record<string, unknown>;
    } catch {
      console.error("Failed to parse AI response:", analysisText);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 502 }
      );
    }

    const fusionContext = buildFusionContext(preparation.quality);

    let embeddingCandidates: RetrievalCandidate[] = [];
    try {
      if (preparation.preparedImages.length > 0) {
        const embedding = await getImageEmbedding(
          preparation.preparedImages[0]
        );
        embeddingCandidates = await findNearestStrainsFromDataset(embedding);
      }
    } catch (err) {
      console.warn("Embedding pipeline failed:", err);
    }

    const gptCandidates = convertGptMatchesToCandidates(
      (analysis as Record<string, unknown>).rankedMatches
    );

    const metadataCandidates = generateMetadataCandidates(gptCandidates);

    const fusedCandidates = fuseHybridScanCandidates([
      ...fusionContext.retrievalCandidates,
      ...embeddingCandidates,
      ...metadataCandidates,
      ...gptCandidates,
    ]);

    // TODO(scanner-brain): trained embedding retrieval against a photo / packaging index, then fuse candidates before ranking
    // TODO(scanner-brain): rerank top model candidates against internal strain catalog + metadata (vector or rules)
    // TODO(scanner-brain): apply real-vs-synthetic / stock-photo confidence penalties when a detector exists
    // TODO(scanner-brain): enrich with internal DB fields (lineage, verified terpenes) post-rerank — no extra network in this route yet
    void fusionContext;

    const fusedMatches = fusedCandidates.slice(0, 3).map((c) => {
      // Scaled agreement boost: more sources = higher confidence (capped)
      const sourceCount = Array.isArray(c.sources) ? c.sources.length : 0;
      const agreementBoost = Math.min(10, Math.max(0, (sourceCount - 1) * 5));

      const boostedScore = c.score + agreementBoost;

      const adjustedConfidence = applyConfidenceAdjustments(
        boostedScore,
        fusionContext
      );

      return {
        strainName: c.strainName,
        confidence: adjustedConfidence,
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
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Internal scanner error", detail: String(error).slice(0, 500) },
      { status: 500 }
    );
  }
}
