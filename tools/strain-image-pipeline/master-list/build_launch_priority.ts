#!/usr/bin/env npx tsx
/**
 * Link master list (canonical_strains.json) to image index and produce launch-priority output.
 * Creates:
 *   - strain_image_link.json (master list ↔ image availability)
 *   - launch_priority_5000.json (top 5,000 strains ranked for launch)
 *   - image_backed_strains.json (strains that have image folders)
 *
 * Usage:
 *   npm run master-list:build-launch-priority
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

interface ImageFolderEntry {
  folderKey: string;
  displayName: string;
  slug: string;
  imageCount: number;
  examplePaths: string[];
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

function main() {
  const canonicalPath = join(MASTER_LIST_DIR, "canonical_strains.json");
  const imageIndexPath = join(MASTER_LIST_DIR, "image_folder_index.json");

  if (!existsSync(canonicalPath)) {
    console.error(`Canonical strains not found: ${canicalPath}`);
    process.exit(1);
  }
  if (!existsSync(imageIndexPath)) {
    console.error(`Image index not found. Run: npm run master-list:build-image-index`);
    process.exit(1);
  }

  const canonical: CanonicalStrain[] = JSON.parse(
    readFileSync(canonicalPath, "utf-8")
  );
  const imageIndex: ImageFolderEntry[] = JSON.parse(
    readFileSync(imageIndexPath, "utf-8")
  );

  const slugToImage = new Map<string, ImageFolderEntry>();
  const displayToImage = new Map<string, ImageFolderEntry>();
  const slugPrefixToImage: { prefix: string; entry: ImageFolderEntry }[] = [];
  for (const e of imageIndex) {
    if (e.imageCount > 0) {
      const s = toSlug(e.slug);
      if (!slugToImage.has(s)) slugToImage.set(s, e);
      const d = e.displayName.toLowerCase().trim();
      if (!displayToImage.has(d)) displayToImage.set(d, e);
      const baseSlug = s.replace(/-[a-f0-9]{32}$/, "");
      if (baseSlug !== s) slugPrefixToImage.push({ prefix: baseSlug, entry: e });
    }
  }

  interface LinkedStrain {
    canonicalName: string;
    slug: string;
    hasImages: boolean;
    imageCount: number;
    imageFolderKey?: string;
    examplePaths: string[];
    aliasCount: number;
    matchType?: "slug" | "display";
  }

  const linked: LinkedStrain[] = [];
  const imageBacked: LinkedStrain[] = [];

  for (const c of canonical) {
    const slug = toSlug(c.canonicalName);
    let img =
      slugToImage.get(slug) ??
      displayToImage.get(c.canonicalName.toLowerCase().trim()) ??
      slugPrefixToImage.find((p) => p.prefix === slug)?.entry ??
      slugPrefixToImage.find((p) => slug.startsWith(p.prefix) || p.prefix.startsWith(slug))
        ?.entry;
    let matchType: "slug" | "display" | undefined;
    if (img) {
      if (slugToImage.get(toSlug(img.slug))) matchType = "slug";
      else matchType = "display";
    }
    const hasImages = !!img && img.imageCount > 0;
    const entry: LinkedStrain = {
      canonicalName: c.canonicalName,
      slug,
      hasImages,
      imageCount: img?.imageCount ?? 0,
      imageFolderKey: img?.folderKey,
      examplePaths: img?.examplePaths ?? [],
      aliasCount: c.aliases.length,
      matchType,
    };
    linked.push(entry);
    if (hasImages) imageBacked.push(entry);
  }

  const linkPath = join(MASTER_LIST_DIR, "strain_image_link.json");
  writeFileSync(
    linkPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total_canonical: linked.length,
        with_images: linked.filter((l) => l.hasImages).length,
        without_images: linked.filter((l) => !l.hasImages).length,
        strains: linked,
      },
      null,
      2
    )
  );

  const imageBackedPath = join(MASTER_LIST_DIR, "image_backed_strains.json");
  writeFileSync(
    imageBackedPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: imageBacked.length,
        strains: imageBacked,
      },
      null,
      2
    )
  );

  // Launch priority: has images first, then by alias count (more variants = more established), then by image count
  const scored = linked.map((s) => {
    let score = 0;
    if (s.hasImages) score += 1000;
    score += Math.min(s.aliasCount * 10, 100);
    score += Math.min(s.imageCount, 50);
    return { ...s, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  const priority = scored.slice(0, 5000).map(({ _score, ...s }) => s);

  const launchPath = join(MASTER_LIST_DIR, "launch_priority_5000.json");
  writeFileSync(
    launchPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: priority.length,
        strains: priority,
      },
      null,
      2
    )
  );

  console.log(`Wrote ${linkPath}`);
  console.log(`Wrote ${imageBackedPath} (${imageBacked.length} image-backed)`);
  console.log(`Wrote ${launchPath} (top 5,000)`);
  console.log(`  With images: ${linked.filter((l) => l.hasImages).length}`);
  console.log(`  Without images: ${linked.filter((l) => !l.hasImages).length}`);
}

main();
