#!/usr/bin/env npx tsx
/**
 * Master-list dedupe scaffold: ingest raw strain names, normalize, group likely duplicates,
 * output dedupe_candidates.json, canonical_strains.json, and alias_map.json.
 *
 * Usage:
 *   npm run master-list:dedupe                    # loads raw_imported_names.json from Vault
 *   npm run master-list:dedupe -- <path>          # loads from specific file
 *   echo "Strain A\nStrain B" | npm run master-list:dedupe -- -
 *
 * Input: raw_imported_names.json (array of { name: string } or { names: string[] })
 * Output: dedupe_candidates.json, canonical_strains.json, alias_map.json
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

/** Normalize for grouping: lowercase, remove hyphens, punctuation, trim */
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[-–—#]/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim() || "unknown";
}

/** Pick the most readable canonical name from variants (prefer Title Case, fewer special chars) */
function pickCanonicalName(variants: string[]): string {
  const scored = variants.map((v) => {
    let score = 0;
    const hasHyphen = /-/.test(v);
    const hasNum = /\d/.test(v);
    const hasPunct = /[#&]/.test(v);
    const isTitleCase = /^[A-Z][a-z]/.test(v.trim());
    const wordCount = v.trim().split(/\s+/).length;
    if (isTitleCase) score += 10;
    if (!hasHyphen) score += 5;
    if (!hasPunct) score += 3;
    if (wordCount <= 3) score += 2;
    if (!hasNum || /^[A-Za-z]+\s*(#?\d+)$/.test(v)) score += 1;
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.v ?? variants[0];
}

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] ?? join(VAULT_ROOT, "master_list", "raw_imported_names.json");
  let rawNames: string[] = [];

  if (inputPath === "-") {
    rawNames = readFileSync(0, "utf-8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (existsSync(inputPath)) {
    const content = readFileSync(inputPath, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      rawNames = parsed.map((x) => (typeof x === "object" && x && "name" in x ? String((x as { name: string }).name) : String(x)));
    } else if (typeof parsed === "object" && parsed && "names" in parsed) {
      rawNames = (parsed as { names: string[] }).names;
    } else {
      rawNames = [content];
    }
  } else {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const byKey = new Map<string, string[]>();
  for (const raw of rawNames) {
    const key = normalizeKey(raw);
    const list = byKey.get(key) ?? [];
    if (!list.includes(raw)) list.push(raw);
    byKey.set(key, list);
  }

  const dedupeCandidates: { normalized: string; variants: string[] }[] = [];
  const dedupeReview: {
    normalized: string;
    variantCount: number;
    variants: string[];
    suggestedCanonical: string;
    reviewStatus: "pending" | "approved" | "rejected";
    mergeTarget?: string;
    notes?: string;
  }[] = [];
  const canonicalStrains: { canonicalName: string; aliases: string[] }[] = [];
  const aliasMap: Record<string, string> = {};

  for (const [normalized, variants] of byKey.entries()) {
    const canonical = pickCanonicalName(variants);
    const aliases = variants.filter((v) => v !== canonical);
    dedupeCandidates.push({ normalized, variants });
    dedupeReview.push({
      normalized,
      variantCount: variants.length,
      variants,
      suggestedCanonical: canonical,
      reviewStatus: "pending",
    });
    canonicalStrains.push({ canonicalName: canonical, aliases });
    for (const v of variants) {
      const vNorm = v
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[-–—]/g, "-");
      if (!aliasMap[vNorm]) aliasMap[vNorm] = canonical;
      const vKey = normalizeKey(v);
      if (!aliasMap[vKey]) aliasMap[vKey] = canonical;
    }
  }

  const outDir = join(VAULT_ROOT, "master_list");
  mkdirSync(outDir, { recursive: true });

  dedupeReview.sort((a, b) => b.variantCount - a.variantCount);

  writeFileSync(
    join(outDir, "dedupe_candidates.json"),
    JSON.stringify(dedupeCandidates, null, 2)
  );
  writeFileSync(
    join(outDir, "dedupe_review.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), total_raw: rawNames.length, groups: dedupeReview },
      null,
      2
    )
  );
  writeFileSync(
    join(outDir, "canonical_strains.json"),
    JSON.stringify(canonicalStrains, null, 2)
  );
  writeFileSync(
    join(outDir, "alias_map.json"),
    JSON.stringify(aliasMap, null, 2)
  );

  const reviewStatePath = join(outDir, "review_state.json");
  if (!existsSync(reviewStatePath)) {
    writeFileSync(
      reviewStatePath,
      JSON.stringify(
        {
          schema: "review_state_v1",
          updated_at: new Date().toISOString(),
          decisions: [] as { normalized: string; status: "approved" | "rejected"; canonical?: string; notes?: string }[],
        },
        null,
        2
      )
    );
    console.log(`Wrote ${reviewStatePath} (scaffold)`);
  }

  console.log(`Wrote ${outDir}/dedupe_candidates.json (${dedupeCandidates.length} groups)`);
  console.log(`Wrote ${outDir}/dedupe_review.json (${dedupeReview.length} groups, sorted by variant count)`);
  console.log(`Wrote ${outDir}/canonical_strains.json (${canonicalStrains.length} canonical)`);
  console.log(`Wrote ${outDir}/alias_map.json (${Object.keys(aliasMap).length} aliases)`);
}

main();
