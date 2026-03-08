#!/usr/bin/env npx tsx
/**
 * Inspect the 35k strain dataset on TheVault. Read-only, does not modify source.
 *
 * Usage:
 *   npm run master-list:inspect-35k
 *   npx tsx inspect_vault_35k.ts
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const VAULT_ROOT = "/Volumes/TheVault";
const STRAINS_PATH = join(VAULT_ROOT, "full_strains_35000.txt");
const DATASETS_PATH = join(VAULT_ROOT, "StrainSpotter/datasets");

interface StrainLine {
  displayName: string;
  slug: string;
  lineNum: number;
}

function parse35k(content: string): StrainLine[] {
  const lines = content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const records: StrainLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split("|");
    const displayName = parts[0]?.trim() ?? "";
    const slug = parts[1]?.trim() ?? "";
    if (displayName && slug) {
      records.push({ displayName, slug, lineNum: i + 1 });
    }
  }
  return records;
}

function main() {
  console.log("=== 35k Strain Dataset Inspection ===\n");

  if (!existsSync(VAULT_ROOT)) {
    console.error("TheVault not mounted at", VAULT_ROOT);
    process.exit(1);
  }

  if (!existsSync(STRAINS_PATH)) {
    console.error("full_strains_35000.txt not found at", STRAINS_PATH);
    process.exit(1);
  }

  const content = readFileSync(STRAINS_PATH, "utf-8");
  const records = parse35k(content);

  console.log("1. Dataset file");
  console.log("   Path:", STRAINS_PATH);
  console.log("   Type: plain text (UTF-8), pipe-delimited");
  console.log("   Format: Display Name|slug");
  console.log("   Record count:", records.length);
  console.log("   Size:", (content.length / 1024).toFixed(1), "KB\n");

  console.log("2. Fields");
  console.log("   - displayName (first column)");
  console.log("   - slug (second column)\n");

  console.log("3. Sample records (first 10)");
  records.slice(0, 10).forEach((r) => {
    console.log(`   ${r.lineNum}. ${r.displayName} | ${r.slug}`);
  });

  console.log("\n4. Sample records (popular strains)");
  const popular = ["Northern Lights", "Blue Dream", "OG Kush", "Sour Diesel", "Blue Dwarf"];
  for (const name of popular) {
    const r = records.find((x) =>
      x.displayName.toLowerCase().includes(name.toLowerCase())
    );
    if (r) console.log(`   ${r.displayName} | ${r.slug}`);
  }

  // Check datasets folder for images
  console.log("\n5. Associated images (StrainSpotter/datasets)");
  if (existsSync(DATASETS_PATH)) {
    let datasetFolders = 0;
    try {
      datasetFolders = readdirSync(DATASETS_PATH, { withFileTypes: true }).filter(
        (d) => d.isDirectory()
      ).length;
    } catch {
      datasetFolders = 0;
    }
    console.log("   Path:", DATASETS_PATH);
    console.log("   Strain folders (with images):", datasetFolders);
    console.log(
      "   Folder naming: Display Name|slug (same as full_strains_35000.txt)"
    );
  } else {
    console.log("   Not found:", DATASETS_PATH);
  }

  console.log("\nDone.");
}

main();
