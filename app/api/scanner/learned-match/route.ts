import { NextRequest, NextResponse } from "next/server";
import {
  applyLearningLayer,
  normalizeMatches,
  requireScannerSupabase,
  type SmartScannerMatch,
} from "@/lib/server/smartScannerLearning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LearnedMatchBody = {
  images?: string[];
  sellersClaim?: string;
  result?: unknown;
  matches?: unknown[];
  candidates?: unknown[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LearnedMatchBody;
    const basePayload = await resolveBasePayload(req, body);
    const baseMatches = normalizeMatches(basePayload);

    if (baseMatches.length === 0) {
      return NextResponse.json({
        ok: true,
        match: null,
        matches: [],
        confidence: 0,
        reasoning: ["Existing scanner returned no match candidates."],
      });
    }

    const supabase = requireScannerSupabase();
    const learnedMatches = await applyLearningLayer(baseMatches, supabase);
    const topMatch = learnedMatches[0] ?? null;

    return NextResponse.json({
      ok: true,
      match: topMatch,
      matches: learnedMatches,
      confidence: topMatch?.confidence ?? 0,
      reasoning: buildReasoning(topMatch, learnedMatches.length),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isConfigError = message.includes("Missing required Supabase");
    return NextResponse.json(
      {
        error: isConfigError ? "Supabase is not configured" : "Learned match failed",
        detail: message,
      },
      { status: isConfigError ? 500 : 500 }
    );
  }
}

async function resolveBasePayload(req: NextRequest, body: LearnedMatchBody): Promise<unknown> {
  if (Array.isArray(body.matches) || Array.isArray(body.candidates) || body.result) {
    return body;
  }

  if (!Array.isArray(body.images) || body.images.length === 0) {
    throw new Error("Provide either existing scanner results or images for /api/scan.");
  }

  const scanResponse = await fetch(new URL("/api/scan", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.get("authorization")
        ? { Authorization: req.headers.get("authorization") as string }
        : {}),
    },
    body: JSON.stringify({
      images: body.images,
      sellersClaim: typeof body.sellersClaim === "string" ? body.sellersClaim : undefined,
    }),
    cache: "no-store",
  });

  const payload = await scanResponse.json().catch(() => null);
  if (!scanResponse.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `status ${scanResponse.status}`;
    throw new Error(`/api/scan failed: ${detail}`);
  }

  return payload;
}

function buildReasoning(topMatch: SmartScannerMatch | null, matchCount: number): string[] {
  if (!topMatch) return ["No learned match available."];
  return [
    `Reused the existing scanner candidate list (${matchCount} candidate${matchCount === 1 ? "" : "s"}).`,
    ...topMatch.reasoning,
  ];
}
