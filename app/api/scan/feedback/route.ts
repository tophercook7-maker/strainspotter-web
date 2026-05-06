import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { appendConfirmedScanTraining } from "@/lib/scanner/saveConfirmedTraining";
import {
  applyConsensusConflictTrust,
  awardFeedbackPoints,
  getUserRewardSummary,
  hasPriorFeedbackForScanUser,
  type FeedbackForReward,
} from "@/lib/scanner/rewardSystem";
import { resolveFeedbackUserId } from "@/lib/server/feedbackUser";

export const runtime = "nodejs";

const FEEDBACK_PATH = path.join(process.cwd(), "data", "scan-feedback-local.jsonl");
const RECALIB_FLAG = path.join(
  process.cwd(),
  "data",
  "scanner-training",
  "recalibration-needed.json"
);

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFeedback(input: Record<string, unknown>) {
  const predictedTopMatches = Array.isArray(input.predictedTopMatches)
    ? input.predictedTopMatches
    : Array.isArray(input.topMatches)
      ? input.topMatches
      : [];

  const noneOfThese = Boolean(input.noneOfThese);
  const selectedMatchSlug =
    typeof input.selectedMatchSlug === "string" ? input.selectedMatchSlug : null;
  const selectedMatchName =
    typeof input.selectedMatchName === "string" ? input.selectedMatchName : null;

  const correctStrainSlug = noneOfThese
    ? typeof input.correctedStrainName === "string" && input.correctedStrainName.trim()
      ? slugify(input.correctedStrainName)
      : null
    : selectedMatchSlug;

  const correctStrainName = noneOfThese
    ? typeof input.correctedStrainName === "string"
      ? input.correctedStrainName.trim()
      : null
    : selectedMatchName;

  const sortedTop = [...predictedTopMatches]
    .filter((m) => m && typeof m === "object")
    .sort((a, b) => {
      const ra = typeof (a as { rank?: number }).rank === "number" ? (a as { rank?: number }).rank! : 99;
      const rb = typeof (b as { rank?: number }).rank === "number" ? (b as { rank?: number }).rank! : 99;
      return ra - rb;
    });
  const top1 = sortedTop[0] as { slug?: string } | undefined;
  const top1Slug = top1 && typeof top1.slug === "string" ? top1.slug : null;
  const wrongTopMatchSlug =
    correctStrainSlug && top1Slug && top1Slug !== correctStrainSlug ? top1Slug : null;

  let previousRank: number | null = null;
  let previousConfidence: number | null = null;
  if (correctStrainSlug) {
    const hit = sortedTop.find((m) => {
      const o = m as { slug?: string };
      return typeof o.slug === "string" && o.slug === correctStrainSlug;
    }) as { rank?: number; confidence?: number } | undefined;
    if (hit) {
      previousRank = typeof hit.rank === "number" ? hit.rank : null;
      previousConfidence = typeof hit.confidence === "number" ? hit.confidence : null;
    }
  }

  return {
    created_at: new Date().toISOString(),
    scanId: typeof input.scanId === "string" ? input.scanId : null,
    filename:
      typeof input.filename === "string"
        ? input.filename
        : typeof input.uploadedFilename === "string"
          ? input.uploadedFilename
          : null,
    predictedTopMatches,
    selectedMatchSlug,
    selectedMatchName,
    correctStrainSlug,
    correctStrainName,
    wrongTopMatchSlug,
    previousRank,
    previousConfidence,
    noneOfThese,
    correctedStrainName:
      typeof input.correctedStrainName === "string"
        ? input.correctedStrainName
        : null,
    notes: typeof input.notes === "string" ? input.notes : "",
    visualTraits:
      input.visualTraits && typeof input.visualTraits === "object"
        ? (input.visualTraits as Record<string, unknown>)
        : {},
    embeddingNearestNeighbors: Array.isArray(input.embeddingNearestNeighbors)
      ? input.embeddingNearestNeighbors
      : Array.isArray(input.topEmbeddingMatches)
        ? input.topEmbeddingMatches
        : [],
    wrongTopMatches: Array.isArray(input.wrongTopMatches)
      ? input.wrongTopMatches
      : Array.isArray(input.topMatches)
        ? input.topMatches
        : [],
    uploadedImageLocalPath:
      typeof input.uploadedImageLocalPath === "string"
        ? input.uploadedImageLocalPath
        : null,
    topMatches: Array.isArray(input.topMatches) ? input.topMatches : predictedTopMatches,
    provider: typeof input.provider === "string" ? input.provider : null,
    model: typeof input.model === "string" ? input.model : null,
  };
}

function shouldPersistConfirmedTraining(f: ReturnType<typeof sanitizeFeedback>): boolean {
  if (!f.correctStrainSlug) return false;
  if (f.noneOfThese) {
    return Boolean(f.correctedStrainName && String(f.correctedStrainName).trim());
  }
  return Boolean(f.selectedMatchSlug);
}

function qualifiesForRewardPoints(f: ReturnType<typeof sanitizeFeedback>): boolean {
  if (!f.correctStrainSlug) return false;
  if (f.noneOfThese) {
    return Boolean(f.correctedStrainName && String(f.correctedStrainName).trim());
  }
  return Boolean(f.selectedMatchSlug);
}

async function writeRecalibrationNeededFlag() {
  await fs.mkdir(path.dirname(RECALIB_FLAG), { recursive: true });
  await fs.writeFile(
    RECALIB_FLAG,
    JSON.stringify(
      {
        needed: true,
        reason: "new feedback",
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const userId = await resolveFeedbackUserId(
    req,
    typeof body.anonymousDeviceId === "string" ? body.anonymousDeviceId : null
  );
  const feedbackBase = sanitizeFeedback(body);

  if (hasPriorFeedbackForScanUser(feedbackBase.scanId, userId)) {
    const summary = getUserRewardSummary(userId);
    return NextResponse.json({
      ok: true,
      duplicateFeedback: true,
      trainingWarnings: [] as string[],
      reward: {
        pointsAwarded: 0,
        totalPoints: summary.totalPoints,
        badgeUnlocked: null as string | null,
        message: "Already saved — thanks for helping train this scan.",
        trustLevel: summary.trustLevel,
        trustWeight: summary.trustWeight,
      },
    });
  }

  const feedback = { ...feedbackBase, userId };

  await fs.mkdir(path.dirname(FEEDBACK_PATH), { recursive: true });
  await fs.appendFile(FEEDBACK_PATH, `${JSON.stringify(feedback)}\n`, "utf8");

  let trainingWarnings: string[] = [];
  let imageSaved = false;

  if (shouldPersistConfirmedTraining(feedback)) {
    const { warnings, imageSaved: saved } = await appendConfirmedScanTraining({
      scanId: feedback.scanId,
      correctStrainSlug: feedback.correctStrainSlug!,
      correctStrainName: feedback.correctStrainName || feedback.correctStrainSlug!,
      predictedTopMatches: feedback.predictedTopMatches,
      visualTraits: feedback.visualTraits,
      embeddingNearestNeighbors: feedback.embeddingNearestNeighbors,
      provider: feedback.provider,
      model: feedback.model,
      trainingImageBase64:
        typeof body.trainingImageBase64 === "string" ? body.trainingImageBase64 : null,
      trainingImageContentType:
        typeof body.trainingImageContentType === "string"
          ? body.trainingImageContentType
          : "image/jpeg",
      wrongTopMatchSlug: feedback.wrongTopMatchSlug,
      previousRank: feedback.previousRank,
      previousConfidence: feedback.previousConfidence,
      scanCreatedAt: typeof body.scanCreatedAt === "string" ? body.scanCreatedAt : null,
    });
    trainingWarnings = warnings;
    imageSaved = saved;

    if (process.env.SCANNER_AUTO_RECALIBRATE === "true") {
      await writeRecalibrationNeededFlag();
    }
  }

  const rewardInput: FeedbackForReward = {
    noneOfThese: feedback.noneOfThese,
    selectedMatchSlug: feedback.selectedMatchSlug,
    selectedMatchName: feedback.selectedMatchName,
    correctedStrainName: feedback.correctedStrainName,
    correctStrainSlug: feedback.correctStrainSlug,
    correctStrainName: feedback.correctStrainName,
    wrongTopMatchSlug: feedback.wrongTopMatchSlug,
    previousRank: feedback.previousRank,
    previousConfidence: feedback.previousConfidence,
    scanId: feedback.scanId,
    predictedTopMatches: feedback.predictedTopMatches,
  };

  let reward = {
    pointsAwarded: 0,
    totalPoints: 0,
    badgeUnlocked: null as string | null,
    message: "Feedback saved.",
    trustLevel: "Standard",
    trustWeight: 1,
  };

  if (qualifiesForRewardPoints(feedback)) {
    const outcome = awardFeedbackPoints({
      feedback: rewardInput,
      userId,
      imageSaved,
    });
    reward = {
      pointsAwarded: outcome.pointsAwarded,
      totalPoints: outcome.totalPoints,
      badgeUnlocked: outcome.badgeUnlocked,
      message: outcome.message,
      trustLevel: outcome.trustLevel,
      trustWeight: outcome.trustWeight,
    };
  } else {
    const summary = getUserRewardSummary(userId);
    reward = {
      pointsAwarded: 0,
      totalPoints: summary.totalPoints,
      badgeUnlocked: null,
      message: "Feedback saved.",
      trustLevel: summary.trustLevel,
      trustWeight: summary.trustWeight,
    };
  }

  applyConsensusConflictTrust(feedback.scanId);

  return NextResponse.json({
    ok: true,
    trainingWarnings,
    reward,
  });
}
