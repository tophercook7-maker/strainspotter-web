#!/usr/bin/env npx ts-node
/**
 * Master-list dedupe scaffold: ingest raw strain names, normalize, group likely duplicates,
 * output a reviewable candidate merge list. Human review decides which become canonical.
 *
 * Usage:
 *   npx ts-node dedupe-scaffold.ts <raw-names-file> [--output-dir <dir>]
 *   echo "Strain A\nStrain B" | npx ts-node dedupe-scaffold.ts -
 *
 * Reads raw names (one per line or JSON array), normalizes, groups by normalized slug,
 * writes dedupe_candidates.json and raw_imported_names.json to Vault master_list/.
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s*[-–—]\s*/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

function normalizeDisplay(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—]\s*/g, " × ");
}

interface DedupeGroup {
  canonical_slug: string;
  canonical_name: string;
  variants: { raw_name: string; normalized: string }[];
  count: number;
}

interface DedupeOutput {
  generated_at: string;
  total_raw: number;
  unique_slugs: number;
  groups: DedupeGroup[];
}

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] ?? "-";
  let rawNames: string[] = [];

  if (inputPath === "-") {
    rawNames = readFileSync(0, "utf-8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    const content = readFileSync(inputPath, "utf-8");
    try {
      const parsed = JSON.parse(content);
      rawNames = Array.isArray(parsed) ? parsed : [content];
    } catch {
      rawNames = content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    }
  }

  const bySlug = new Map<string, string[]>();
  for (const raw of rawNames) {
    const slug = slugify(raw);
    const list = bySlug.get(slug) ?? [];
    if (!list.includes(raw)) list.push(raw);
    bySlug.set(slug, list);
  }

  const groups: DedupeGroup[] = [];
  for (const [slug, variants] of bySlug.entries()) {
    const canonical = normalizeDisplay(variants[0]);
    groups.push({
      canonical_slug: slug,
      canonical_name: canonical,
      variants: variants.map((v) => ({ raw_name: v, normalized: slugify(v) })),
      count: variants.length,
    });
  }

  const output: DedupeOutput = {
    generated_at: new Date().toISOString(),
    total_raw: rawNames.length,
    unique_slugs: groups.length,
    groups: groups.sort((a, b) => b.count - a.count),
  };

  const outDir = join(VAULT_ROOT, "master_list");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, "dedupe_candidates.json"),
    JSON.stringify(output, null, 2)
  );
  writeFileSync(
    join(outDir, "raw_imported_names.json"),
    JSON.stringify(
      { imported_at: new Date().toISOString(), names: rawNames },
      null,
      2
    )
  );

  console.log(`Wrote ${outDir}/dedupe_candidates.json (${groups.length} unique slugs)`);
  console.log(`Wrote ${outDir}/raw_imported_names.json (${rawNames.length} raw names)`);
}

main();
