#!/usr/bin/env npx tsx
/**
 * Build the launch reference index: joined view of 5,000 launch strains with
 * image folder, approved reference images, and embedding status.
 *
 * Distinguishes:
 *   - image-backed (source dataset has images)
 *   - has approved reference images (promoted to approved/)
 *   - has embeddings (retrieval-ready)
 *
 * Outputs:
 *   - launch_reference_index_5000.json
 *   - launch_reference_summary.json
 *   - launch_reference_ready.json (retrieval-ready)
 *   - launch_reference_needs_approval.json (images but no approved yet)
 *   - launch_reference_needs_embeddings.json (approved but no embeddings yet)
 *
 * Usage:
 *   npm run master-list:build-launch-reference-index
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault/strainspotter-vault")
    ? "/Volumes/TheVault/strainspotter-vault"
    : join(__dirname, "../../vault-output"));

const MASTER_LIST_DIR = join(VAULT_ROOT, "master_list");
const APPROVED_BASE = join(VAULT_ROOT, "approved", "strain_reference_images");
const EMBEDDING_MANIFEST = join(VAULT_ROOT, "embeddings", "image_vectors", "manifest.json");

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

interface LaunchReadyStrain {
  canonicalName: string;
  slug: string;
  aliases: string[];
  imageFolderKey: string;
  imageCount: number;
  examplePaths: string[];
  launchPriorityScore?: number;
  launchPriorityReason?: string;
}

interface EmbeddingEntry {
  imageId: string;
  strainSlug: string;
  imagePath?: string;
  embeddingFile?: string;
}

interface EmbeddingManifest {
  entries?: EmbeddingEntry[];
}

interface LaunchReferenceRecord {
  canonicalName: string;
  slug: string;
  aliases: string[];
  sourceDatasetFolderKey: string;
  imageFolderPath: string;
  imageCount: number;
  approvedImageCount: number;
  embeddingCount: number;
  exampleImagePaths: string[];
  hasImages: boolean;
  hasApprovedImages: boolean;
  hasEmbeddings: boolean;
  retrievalReady: boolean;
  readinessReason?: string;
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function countApprovedImages(strainSlug: string): number {
  let count = 0;
  if (!existsSync(APPROVED_BASE)) return 0;
  try {
    const types = readdirSync(APPROVED_BASE, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const typeDir of types) {
      const strainDir = join(APPROVED_BASE, typeDir.name, strainSlug);
      if (!existsSync(strainDir)) continue;
      const files = readdirSync(strainDir);
      for (const f of files) {
        const ext = f.toLowerCase().slice(f.lastIndexOf("."));
        if (IMAGE_EXT.includes(ext)) count++;
      }
    }
  } catch (_) {}
  return count;
}

function countEmbeddingsForSlug(slug: string, manifest: EmbeddingManifest): number {
  const entries = manifest.entries ?? [];
  const slugNorm = toSlug(slug);
  return entries.filter((e) => toSlug(e.strainSlug) === slugNorm).length;
}

function main() {
  const launchReadyPath = join(MASTER_LIST_DIR, "launch_ready_image_backed_5000.json");
  if (!existsSync(launchReadyPath)) {
    console.error(`Launch ready file not found: ${launchReadyPath}`);
    console.error("Run: npm run master-list:build-launch-ready");
    process.exit(1);
  }

  const launchReadyData = JSON.parse(readFileSync(launchReadyPath, "utf-8"));
  const launchStrains: LaunchReadyStrain[] = launchReadyData.strains ?? [];

  let embeddingManifest: EmbeddingManifest = {};
  if (existsSync(EMBEDDING_MANIFEST)) {
    try {
      embeddingManifest = JSON.parse(readFileSync(EMBEDDING_MANIFEST, "utf-8"));
    } catch (_) {}
  }

  const records: LaunchReferenceRecord[] = [];

  for (const s of launchStrains) {
    const slug = toSlug(s.slug);
    const approvedCount = countApprovedImages(slug);
    const embeddingCount = countEmbeddingsForSlug(slug, embeddingManifest);

    const hasImages = (s.imageCount ?? 0) > 0;
    const hasApprovedImages = approvedCount > 0;
    const hasEmbeddings = embeddingCount > 0;
    const retrievalReady = hasImages && hasApprovedImages && hasEmbeddings;

    let readinessReason: string;
    if (retrievalReady) readinessReason = "ready";
    else if (!hasImages) readinessReason = "no source images";
    else if (!hasApprovedImages) readinessReason = "needs approval";
    else if (!hasEmbeddings) readinessReason = "needs embeddings";
    else readinessReason = "incomplete";

    const imageFolderPath = s.imageFolderKey
      ? join("/Volumes/TheVault/StrainSpotter/datasets", s.imageFolderKey)
      : "";

    records.push({
      canonicalName: s.canonicalName,
      slug,
      aliases: s.aliases ?? [],
      sourceDatasetFolderKey: s.imageFolderKey ?? "",
      imageFolderPath,
      imageCount: s.imageCount ?? 0,
      approvedImageCount: approvedCount,
      embeddingCount,
      exampleImagePaths: s.examplePaths ?? [],
      hasImages,
      hasApprovedImages,
      hasEmbeddings,
      retrievalReady,
      readinessReason,
    });
  }

  const summary = {
    generated_at: new Date().toISOString(),
    total_launch_strains: records.length,
    with_image_folders: records.filter((r) => r.hasImages).length,
    with_approved_images: records.filter((r) => r.hasApprovedImages).length,
    with_embeddings: records.filter((r) => r.hasEmbeddings).length,
    retrieval_ready: records.filter((r) => r.retrievalReady).length,
  };

  const ready = records.filter((r) => r.retrievalReady);
  const needsApproval = records.filter((r) => r.hasImages && !r.hasApprovedImages);
  const needsEmbeddings = records.filter((r) => r.hasApprovedImages && !r.hasEmbeddings);

  mkdirSync(MASTER_LIST_DIR, { recursive: true });

  writeFileSync(
    join(MASTER_LIST_DIR, "launch_reference_index_5000.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), schema: "launch_reference_index_v1", count: records.length, strains: records },
      null,
      2
    )
  );

  writeFileSync(
    join(MASTER_LIST_DIR, "launch_reference_summary.json"),
    JSON.stringify(summary, null, 2)
  );

  writeFileSync(
    join(MASTER_LIST_DIR, "launch_reference_ready.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), count: ready.length, strains: ready },
      null,
      2
    )
  );

  writeFileSync(
    join(MASTER_LIST_DIR, "launch_reference_needs_approval.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), count: needsApproval.length, strains: needsApproval },
      null,
      2
    )
  );

  writeFileSync(
    join(MASTER_LIST_DIR, "launch_reference_needs_embeddings.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), count: needsEmbeddings.length, strains: needsEmbeddings },
      null,
      2
    )
  );

  console.log(`Wrote launch_reference_index_5000.json (${records.length} strains)`);
  console.log(`Wrote launch_reference_summary.json`);
  console.log(`Wrote launch_reference_ready.json (${ready.length} retrieval-ready)`);
  console.log(`Wrote launch_reference_needs_approval.json (${needsApproval.length})`);
  console.log(`Wrote launch_reference_needs_embeddings.json (${needsEmbeddings.length})`);
  console.log(`  With image folders: ${summary.with_image_folders}`);
  console.log(`  With approved images: ${summary.with_approved_images}`);
  console.log(`  With embeddings: ${summary.with_embeddings}`);
  console.log(`  Retrieval-ready: ${summary.retrieval_ready}`);
}

main();
