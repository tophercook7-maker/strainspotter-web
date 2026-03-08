#!/usr/bin/env npx tsx
/**
 * Master-list dedupe scaffold: ingest raw strain names, normalize, group likely duplicates,
 * output dedupe_candidates.json, canonical_strains.json, alias_map.json.
 *
 * CANONICAL MERGE: For 35k records (with slug), we use slug as the primary grouping key.
 * displayName and slug from the same source line stay as one canonical. We do NOT treat
 * them as separate raw names — the importer no longer adds slug as a raw record.
 *
 * Usage:
 *   npm run master-list:dedupe
 *   npm run master-list:dedupe -- <path>
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

/** Normalize for grouping: lowercase, collapse punctuation/spacing, trim */
function normalizeKey(s: string): string {
  const t = s
    .toLowerCase()
    .trim()
    .replace(/[-–—#]/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t || "unknown";
}

/** Slug canonical: strip trailing UUID, apply normalization. Links slug variants. */
function slugCanonical(slug: string): string {
  const stripped = slug.replace(/-[a-f0-9]{32}$/i, "").trim();
  return normalizeKey(stripped);
}

/** Primary grouping key: use slug when present (source-aware), else normalized name */
function primaryKey(record: { name: string; slug?: string }): string {
  if (record.slug) return slugCanonical(record.slug);
  return normalizeKey(record.name);
}

/** Pick the most readable canonical name (prefer Title Case, fewer special chars) */
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

type RawRecord = {
  name: string;
  slug?: string;
  displayName?: string;
  source_file?: string;
  imported_at?: string;
  source_line?: string;
};

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] ?? join(VAULT_ROOT, "master_list", "raw_imported_names.json");
  let rawRecords: RawRecord[] = [];

  if (inputPath === "-") {
    const lines = readFileSync(0, "utf-8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    rawRecords = lines.map((name) => ({ name }));
  } else if (existsSync(inputPath)) {
    const content = readFileSync(inputPath, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      rawRecords = parsed.map((x) => {
        if (typeof x === "object" && x && "name" in x) {
          return {
            name: String((x as RawRecord).name),
            slug: (x as RawRecord).slug,
            displayName: (x as RawRecord).displayName,
            source_file: (x as RawRecord).source_file,
            imported_at: (x as RawRecord).imported_at,
            source_line: (x as RawRecord).source_line,
          };
        }
        return { name: String(x) };
      });
    } else if (typeof parsed === "object" && parsed && "names" in parsed) {
      rawRecords = (parsed as { names: string[] }).names.map((n) => ({ name: n }));
    } else {
      rawRecords = [{ name: String(content) }];
    }
  } else {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Group by primary key (slug-aware)
  const byKey = new Map<string, { variants: Set<string>; records: RawRecord[] }>();
  for (const rec of rawRecords) {
    const key = primaryKey(rec);
    const existing = byKey.get(key) ?? { variants: new Set<string>(), records: [] };
    existing.variants.add(rec.name);
    if (rec.slug && rec.slug !== rec.name) existing.variants.add(rec.slug);
    existing.records.push(rec);
    byKey.set(key, existing);
  }

  // Merge groups when variants from one group normalize to another group's key
  const keys = Array.from(byKey.keys());
  const parent = new Map<string, string>();
  for (const k of keys) parent.set(k, k);
  function find(k: string): string {
    const p = parent.get(k);
    if (!p || p === k) return k;
    const r = find(p);
    parent.set(k, r);
    return r;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  for (const key of keys) {
    const group = byKey.get(key)!;
    for (const v of group.variants) {
      const nk = normalizeKey(v);
      const sk = slugCanonical(v);
      if (nk && nk !== key && byKey.has(nk)) union(key, nk);
      if (sk && sk !== key && byKey.has(sk)) union(key, sk);
    }
  }
  const merged = new Map<string, { variants: Set<string>; records: RawRecord[] }>();
  for (const key of keys) {
    const root = find(key);
    const existing = merged.get(root) ?? { variants: new Set<string>(), records: [] };
    const group = byKey.get(key)!;
    for (const v of group.variants) existing.variants.add(v);
    existing.records.push(...group.records);
    merged.set(root, existing);
  }
  for (const [k, g] of merged) {
    byKey.set(k, g);
  }
  for (const k of keys) {
    if (find(k) !== k) byKey.delete(k);
  }

  const dedupeCandidates: { normalized: string; variants: string[] }[] = [];
  const dedupeReview: {
    normalized: string;
    variantCount: number;
    variants: string[];
    suggestedCanonical: string;
    reviewStatus: string;
  }[] = [];
  const canonicalStrains: { canonicalName: string; aliases: string[] }[] = [];
  const aliasMap: Record<string, string> = {};

  for (const [normalized, { variants: variantSet }] of byKey.entries()) {
    const variants = Array.from(variantSet);
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
      { generated_at: new Date().toISOString(), total_raw: rawRecords.length, groups: dedupeReview },
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
