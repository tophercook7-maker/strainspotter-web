#!/usr/bin/env npx tsx
/**
 * Build the launch-ready image-backed 5,000 strain set.
 * Uses cleaned canonical + image-link outputs. Outputs only strains with actual
 * image folders, ranked by image coverage and canonical quality.
 *
 * Creates:
 *   - launch_ready_image_backed_5000.json
 *   - launch_ready_image_backed_summary.json
 *
 * Usage:
 *   npm run master-list:build-launch-ready
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault/strainspotter-vault")
    ? "/Volumes/TheVault/strainspotter-vault"
    : join(__dirname, "../../vault-output"));

const MASTER_LIST_DIR = join(VAULT_ROOT, "master_list");

interface CanonicalStrain {
  canonicalName: string;
  aliases: string[];
}

interface ImageBackedStrain {
  canonicalName: string;
  slug: string;
  hasImages: boolean;
  imageCount: number;
  imageFolderKey?: string;
  examplePaths: string[];
  aliasCount: number;
  matchType?: "slug" | "display";
}

interface LaunchReadyRecord {
  canonicalName: string;
  slug: string;
  aliases: string[];
  imageFolderKey: string;
  imageCount: number;
  examplePaths: string[];
  launchPriorityScore: number;
  launchPriorityReason: string;
}

function main() {
  const canonicalPath = join(MASTER_LIST_DIR, "canonical_strains.json");
  const imageBackedPath = join(MASTER_LIST_DIR, "image_backed_strains.json");

  if (!existsSync(canonicalPath)) {
    console.error(`Canonical strains not found: ${canonicalPath}`);
    process.exit(1);
  }
  if (!existsSync(imageBackedPath)) {
    console.error(`Image-backed strains not found. Run: npm run master-list:build-launch-priority`);
    process.exit(1);
  }

  const canonical: CanonicalStrain[] = JSON.parse(
    readFileSync(canonicalPath, "utf-8")
  );
  const imageBackedData = JSON.parse(readFileSync(imageBackedPath, "utf-8"));
  const imageBacked: ImageBackedStrain[] = imageBackedData.strains ?? [];

  const canonicalByName = new Map<string, CanonicalStrain>();
  for (const c of canonical) {
    const key = c.canonicalName.toLowerCase().trim();
    if (!canonicalByName.has(key)) canonicalByName.set(key, c);
  }

  const records: LaunchReadyRecord[] = [];
  for (const s of imageBacked) {
    if (!s.hasImages || s.imageCount <= 0) continue;

    const canon = canonicalByName.get(s.canonicalName.toLowerCase().trim());
    const aliases = canon?.aliases ?? [];

    let score = 0;
    const reasons: string[] = [];
    score += Math.min(s.imageCount, 100);
    if (s.imageCount >= 20) reasons.push("strong image coverage");
    else if (s.imageCount >= 10) reasons.push("good image coverage");
    score += Math.min(s.aliasCount * 5, 50);
    if (s.aliasCount >= 3) reasons.push("established aliases");
    if (s.matchType === "slug") {
      score += 20;
      reasons.push("slug match");
    } else if (s.matchType === "display") {
      score += 10;
      reasons.push("display match");
    }
    const reason = reasons.length ? reasons.join(", ") : "image-backed";

    records.push({
      canonicalName: s.canonicalName,
      slug: s.slug,
      aliases,
      imageFolderKey: s.imageFolderKey ?? "",
      imageCount: s.imageCount,
      examplePaths: s.examplePaths ?? [],
      launchPriorityScore: score,
      launchPriorityReason: reason,
    });
  }

  records.sort((a, b) => b.launchPriorityScore - a.launchPriorityScore);
  const top5000 = records.slice(0, 5000);

  const distribution: Record<string, number> = {};
  for (const r of top5000) {
    const bucket =
      r.imageCount <= 10 ? "1-10" : r.imageCount <= 30 ? "11-30" : r.imageCount <= 100 ? "31-100" : "101+";
    distribution[bucket] = (distribution[bucket] ?? 0) + 1;
  }

  const totalImages = top5000.reduce((s, r) => s + r.imageCount, 0);
  const summary = {
    generated_at: new Date().toISOString(),
    total_selected: top5000.length,
    total_image_backed_available: records.length,
    shortfall_below_5000: Math.max(0, 5000 - records.length),
    shortfall_reason:
      records.length < 5000
        ? `Only ${records.length} strains have image folders; output is best available set.`
        : null,
    total_images: totalImages,
    image_count_distribution: distribution,
    all_image_backed: top5000.every((r) => r.imageCount > 0),
  };

  const outputPath = join(MASTER_LIST_DIR, "launch_ready_image_backed_5000.json");
  const summaryPath = join(MASTER_LIST_DIR, "launch_ready_image_backed_summary.json");

  mkdirSync(MASTER_LIST_DIR, { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        schema: "launch_ready_image_backed_v1",
        count: top5000.length,
        strains: top5000,
      },
      null,
      2
    )
  );
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`Wrote ${outputPath} (${top5000.length} strains)`);
  console.log(`Wrote ${summaryPath}`);
  console.log(`  All image-backed: ${top5000.length}`);
  console.log(`  Total images: ${totalImages}`);
  if (summary.shortfall_below_5000 > 0) {
    console.log(`  Shortfall: ${summary.shortfall_below_5000} (${summary.shortfall_reason})`);
  }
  console.log(`  Distribution:`, distribution);
}

main();
