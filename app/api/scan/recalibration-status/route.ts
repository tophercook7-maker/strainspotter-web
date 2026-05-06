import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { confirmedScansJsonlPath } from "@/lib/scanner/saveConfirmedTraining";

export const runtime = "nodejs";

const REFERENCE_JSONL = path.join(
  process.cwd(),
  "data",
  "strain-reference-images",
  "reference-images.jsonl"
);

const EMBEDDING_INDEX = path.join(
  process.cwd(),
  "data",
  "strain-reference-images",
  "reference-embedding-index.json"
);

const RECALIB_FLAG = path.join(
  process.cwd(),
  "data",
  "scanner-training",
  "recalibration-needed.json"
);

function countJsonlLines(file: string): number {
  if (!fs.existsSync(file)) return 0;
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;
}

function countPromotedReferences(): number {
  if (!fs.existsSync(REFERENCE_JSONL)) return 0;
  let n = 0;
  for (const line of fs.readFileSync(REFERENCE_JSONL, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as { reviewStatus?: string };
      if (row.reviewStatus === "trusted_user_confirmed") n += 1;
    } catch {
      /* skip */
    }
  }
  return n;
}

export async function GET() {
  let recalibrationNeeded = false;
  let lastUpdatedAt = "";

  if (fs.existsSync(RECALIB_FLAG)) {
    try {
      const flag = JSON.parse(fs.readFileSync(RECALIB_FLAG, "utf8")) as {
        needed?: boolean;
        updatedAt?: string;
      };
      recalibrationNeeded = flag.needed === true;
      lastUpdatedAt = typeof flag.updatedAt === "string" ? flag.updatedAt : "";
    } catch {
      /* ignore */
    }
  }

  let embeddingIndexExists = false;
  let embeddingImageCount = 0;
  if (fs.existsSync(EMBEDDING_INDEX)) {
    embeddingIndexExists = true;
    try {
      const j = JSON.parse(fs.readFileSync(EMBEDDING_INDEX, "utf8")) as {
        imageCount?: number;
        records?: unknown[];
      };
      embeddingImageCount = Number(j.imageCount ?? (Array.isArray(j.records) ? j.records.length : 0));
    } catch {
      embeddingImageCount = 0;
    }
  }

  return NextResponse.json({
    ok: true,
    recalibrationNeeded,
    lastUpdatedAt,
    confirmedFeedbackCount: countJsonlLines(confirmedScansJsonlPath()),
    promotedReferenceCount: countPromotedReferences(),
    embeddingIndexExists,
    embeddingImageCount,
  });
}
