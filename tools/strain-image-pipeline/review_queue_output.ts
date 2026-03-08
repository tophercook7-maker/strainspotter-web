/**
 * Review Queue Output — write candidate images and metadata to review_queue for human approval.
 */

import { mkdir, readdir, readFile, copyFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { CONFIG, PATHS, slugify } from "./config.js";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewCandidate {
  id: string;
  strainSlug: string;
  strainName?: string;
  imagePath: string;
  imageType?: string;
  qualityScore?: number;
  sourceUrl?: string;
  /** Human-set: pending, approved, or rejected */
  reviewStatus: ReviewStatus;
  /** Optional notes (e.g. rejection reason) */
  reviewNotes?: string;
  /** Set after promotion: path in approved library */
  approvedTargetPath?: string;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function slugToName(slug: string): string {
  return slug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/**
 * Write candidates to review queue from staging. Copies images and writes manifest.
 * Merges with existing manifest to preserve human-set reviewStatus and reviewNotes.
 */
export async function writeToReviewQueue(
  strainNames: string[]
): Promise<number> {
  const imagesDir = join(CONFIG.VAULT_ROOT, "review_queue", "images");
  await mkdir(imagesDir, { recursive: true });

  let existingByKey: Record<string, { reviewStatus: ReviewStatus; reviewNotes?: string }> = {};
  const manifestPath = join(CONFIG.VAULT_ROOT, "review_queue", "manifest.json");
  const rejectedLogPath = join(CONFIG.VAULT_ROOT, "review_queue", "rejected_log.json");
  try {
    const raw = await readFile(manifestPath, "utf-8");
    const prev = JSON.parse(raw) as { candidates?: Array<Partial<ReviewCandidate> & { imagePath?: string }> };
    const toAppend: Array<{ id: string; strainSlug: string; sourceUrl?: string; reason: string }> = [];
    for (const c of prev.candidates ?? []) {
      const key = c.id ?? (c.imagePath ? basename(c.imagePath).replace(/\.[^.]+$/, "") : null);
      if (key && c.reviewStatus && c.reviewStatus !== "pending") {
        existingByKey[key] = {
          reviewStatus: c.reviewStatus as ReviewStatus,
          reviewNotes: c.reviewNotes,
        };
        if (c.reviewStatus === "rejected") {
          toAppend.push({
            id: key,
            strainSlug: c.strainSlug ?? "unknown",
            sourceUrl: c.sourceUrl,
            reason: c.reviewNotes ?? "rejected",
          });
        }
      }
    }
    if (toAppend.length > 0) {
      let log: unknown[] = [];
      try {
        log = JSON.parse(await readFile(rejectedLogPath, "utf-8"));
        if (!Array.isArray(log)) log = [];
      } catch {
        log = [];
      }
      for (const e of toAppend) {
        log.push({ ...e, timestamp: new Date().toISOString() });
      }
      await mkdir(join(CONFIG.VAULT_ROOT, "review_queue"), { recursive: true });
      await writeFile(rejectedLogPath, JSON.stringify(log, null, 2), "utf-8");
    }
  } catch {
    // no previous manifest
  }

  const candidates: ReviewCandidate[] = [];
  let copied = 0;

  for (const name of strainNames) {
    const dir = PATHS.candidateImages(name);
    let entries: { name: string }[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    const slug = slugify(name);
    const strainName = slugToName(slug);
    for (const e of entries) {
      if (!e.isFile() || !IMAGE_EXTENSIONS.includes(extOf(e.name))) continue;

      const srcPath = join(dir, e.name);
      const metaPath = srcPath.replace(/\.[^.]+$/, ".meta.json");

      let meta: { source_url?: string; image_type?: string; quality_score?: number } = {};
      try {
        meta = JSON.parse(await readFile(metaPath, "utf-8")) as typeof meta;
      } catch {
        meta = {};
      }

      const destName = `${slug}_${basename(e.name)}`;
      const id = destName.replace(/\.[^.]+$/, "");
      const destPath = join(imagesDir, destName);
      try {
        await copyFile(srcPath, destPath);
        copied++;
      } catch {
        continue;
      }

      const existing = existingByKey[id];
      candidates.push({
        id,
        strainSlug: slug,
        strainName,
        imagePath: destPath,
        imageType: (meta.image_type as ReviewCandidate["imageType"]) ?? "bud",
        qualityScore: meta.quality_score,
        sourceUrl: meta.source_url,
        reviewStatus: existing?.reviewStatus ?? "pending",
        reviewNotes: existing?.reviewNotes,
      });
    }
  }

  await mkdir(join(CONFIG.VAULT_ROOT, "review_queue"), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), candidates },
      null,
      2
    ),
    "utf-8"
  );

  return copied;
}
