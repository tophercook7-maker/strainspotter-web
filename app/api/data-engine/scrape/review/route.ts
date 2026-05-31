import { basename, join } from "node:path";
import { existsSync } from "node:fs";
import { NextResponse } from "next/server";
import { dataEnginePaths } from "@/lib/data-engine/dataPaths";
import { IMAGE_CANDIDATES_PATH, REVIEW_MANIFEST_PATH, localOnly, readJson, writeJson } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewDecision = "training" | "eval" | "reject";

const INBOX_DIR = dataEnginePaths.inboxDir();

function safeFileName(value: unknown) {
  return basename(String(value ?? "").replace(/[\\/]/g, "-"));
}

function manifestItemFor(candidate: any, decision: ReviewDecision) {
  const fileName = safeFileName(candidate.fileName);
  return {
    fileName,
    strainSlug: candidate.strainSlug,
    sourceId: candidate.sourceId,
    queryUsed: candidate.queryUsed,
    approvedForTraining: decision === "training",
    approvedForEval: decision === "eval",
    rejectReason: decision === "reject" ? "User chose not to use this photo" : undefined,
    reviewedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const fileName = safeFileName(body?.fileName);
  const decision = body?.decision as ReviewDecision | undefined;

  if (!fileName || !["training", "eval", "reject"].includes(String(decision))) {
    return NextResponse.json({ error: "Missing fileName or review decision." }, { status: 400 });
  }

  const filePath = join(INBOX_DIR, fileName);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Review image file was not found." }, { status: 404 });
  }

  const candidates = await readJson<any[]>(IMAGE_CANDIDATES_PATH, []);
  const index = Array.isArray(candidates) ? candidates.findIndex((item) => item?.fileName === fileName) : -1;
  if (index === -1) {
    return NextResponse.json({ error: "Review candidate was not found." }, { status: 404 });
  }

  const updatedCandidate = {
    ...candidates[index],
    reviewStatus: decision,
    selectedAction: decision,
    reviewedAt: new Date().toISOString(),
    recommendedAction: decision === "reject" ? "reject" : "review",
    rejectReason: decision === "reject" ? "User chose not to use this photo" : candidates[index].rejectReason,
  };
  candidates[index] = updatedCandidate;
  await writeJson(IMAGE_CANDIDATES_PATH, candidates);

  const manifest = await readJson<{ items?: any[] }>(REVIEW_MANIFEST_PATH, { items: [] });
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const manifestItem = manifestItemFor(updatedCandidate, decision as ReviewDecision);
  const manifestIndex = items.findIndex((item) => item?.fileName === fileName);
  if (manifestIndex === -1) items.push(manifestItem);
  else items[manifestIndex] = { ...items[manifestIndex], ...manifestItem };
  await writeJson(REVIEW_MANIFEST_PATH, { ...manifest, items });

  return NextResponse.json({
    status: "success",
    fileName,
    decision,
  });
}
