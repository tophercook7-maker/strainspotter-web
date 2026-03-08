#!/usr/bin/env node
/**
 * Promote approved candidates from review_queue to approved strain reference library.
 * Reads review_queue/manifest.json, promotes items with reviewStatus: "approved".
 */

import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { join, basename } from "path";
import { CONFIG, PATHS, slugify } from "./config.js";
import type { ReviewCandidate } from "./review_queue_output.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export interface ApprovedImageMetadata {
  strainSlug: string;
  strainName?: string;
  imagePath: string;
  imageType: string;
  sourceUrl?: string;
  qualityScore?: number;
  approvalTimestamp: string;
}

function candidateId(c: ReviewCandidate): string {
  return c.id ?? basename(c.imagePath).replace(/\.[^.]+$/, "");
}

async function promoteCandidate(c: ReviewCandidate): Promise<{ path: string; ok: boolean }> {
  const id = candidateId(c);
  const imageType = (c.imageType && c.imageType !== "unknown") ? c.imageType : "bud";
  const destDir = PATHS.approvedStrainImage(c.strainSlug, imageType);
  await mkdir(destDir, { recursive: true });

  const ext = extOf(basename(c.imagePath)) || ".jpg";
  const destName = `${id}${ext}`;
  const destPath = join(destDir, destName);

  try {
    await copyFile(c.imagePath, destPath);
  } catch {
    return { path: destPath, ok: false };
  }

  const metadata: ApprovedImageMetadata = {
    strainSlug: c.strainSlug,
    strainName: c.strainName,
    imagePath: destPath,
    imageType,
    sourceUrl: c.sourceUrl,
    qualityScore: c.qualityScore,
    approvalTimestamp: new Date().toISOString(),
  };

  const metaPath = join(destDir, `${id}.metadata.json`);
  await writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf-8");

  return { path: destPath, ok: true };
}

export async function runPromoteApproved(): Promise<{
  promoted: number;
  rejected: number;
  errors: string[];
}> {
  const manifestPath = join(CONFIG.VAULT_ROOT, "review_queue", "manifest.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch {
    console.error("[PromoteApproved] No review manifest at", manifestPath);
    return { promoted: 0, rejected: 0, errors: ["Manifest not found"] };
  }

  const manifest = JSON.parse(raw) as { candidates?: ReviewCandidate[] };
  const candidates = manifest.candidates ?? [];
  const approved = candidates.filter((c) => c.reviewStatus === "approved");

  if (approved.length === 0) {
    console.log("[PromoteApproved] No approved candidates");
    return {
      promoted: 0,
      rejected: candidates.filter((c) => c.reviewStatus === "rejected").length,
      errors: [],
    };
  }

  let promoted = 0;
  const errors: string[] = [];

  for (const c of approved) {
    const { path, ok } = await promoteCandidate(c);
    if (ok) {
      promoted++;
      c.approvedTargetPath = path;
    } else {
      errors.push(`Failed to promote ${candidateId(c)}`);
    }
  }

  manifest.candidates = candidates;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  return {
    promoted,
    rejected: candidates.filter((c) => c.reviewStatus === "rejected").length,
    errors,
  };
}

async function main() {
  const result = await runPromoteApproved();
  console.log(`[PromoteApproved] promoted=${result.promoted} rejected=${result.rejected}`);
  if (result.errors.length > 0) {
    result.errors.forEach((e) => console.error(e));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
