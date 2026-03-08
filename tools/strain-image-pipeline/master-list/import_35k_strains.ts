#!/usr/bin/env npx tsx
/**
 * Import the full 35k strain list from TheVault into the master-list pipeline.
 * Source: /Volumes/TheVault/full_strains_35000.txt
 * Format: Display Name|slug (pipe-delimited)
 *
 * CANONICAL MERGE: One source line = one raw record. We add only displayName as
 * the raw name; slug is stored in the record for dedupe to use as a linking key.
 * We do NOT add slug as a separate raw record — that caused canonical inflation
 * (display+slug normalizing to different keys, e.g. "Santa Cruz OG" vs "831-og").
 *
 * Handles malformed lines (e.g. extra pipes in display name).
 *
 * Usage:
 *   npm run master-list:import-35k
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault/strainspotter-vault")
    ? "/Volumes/TheVault/strainspotter-vault"
    : join(__dirname, "../../vault-output"));

const MASTER_LIST_DIR = join(VAULT_ROOT, "master_list");
const RAW_IMPORTED_PATH = join(MASTER_LIST_DIR, "raw_imported_names.json");

const SOURCE_PATH =
  process.env.FULL_STRAINS_35K_PATH ?? "/Volumes/TheVault/full_strains_35000.txt";
const SOURCE_LABEL = "full_strains_35000.txt";

type RawRecord = {
  name: string;
  slug?: string;
  displayName?: string;
  source_file?: string;
  imported_at?: string;
  source_line?: string;
};

interface ParsedLine {
  displayName: string;
  slug: string;
  lineNum: number;
  raw: string;
}

function parse35k(content: string): ParsedLine[] {
  const lines = content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const records: ParsedLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const parts = raw.split("|");
    let displayName: string;
    let slug: string;
    if (parts.length >= 2) {
      slug = parts[parts.length - 1]!.trim();
      displayName = parts.slice(0, -1).join("|").trim();
    } else if (parts.length === 1 && parts[0]) {
      displayName = parts[0];
      slug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "unknown";
    } else {
      continue;
    }
    if (displayName && slug) {
      records.push({ displayName, slug, lineNum: i + 1, raw });
    }
  }
  return records;
}

function loadExisting(): RawRecord[] {
  if (!existsSync(RAW_IMPORTED_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(RAW_IMPORTED_PATH, "utf-8")) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((x) => {
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
    }
  } catch (_) {}
  return [];
}

function main() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`35k source not found: ${SOURCE_PATH}`);
    process.exit(1);
  }

  const content = readFileSync(SOURCE_PATH, "utf-8");
  const parsed = parse35k(content);
  console.log(`Parsed ${parsed.length} records from ${SOURCE_LABEL}`);

  let existing = loadExisting();

  // Remove any prior 35k records (they had both display+slug as separate records)
  existing = existing.filter((r) => r.source_file !== SOURCE_LABEL);

  const seen = new Set<string>(existing.map((r) => r.name));
  const now = new Date().toISOString();
  let added = 0;

  for (const { displayName, slug, raw } of parsed) {
    const rec: RawRecord = {
      name: displayName,
      slug,
      displayName,
      source_file: SOURCE_LABEL,
      imported_at: now,
      source_line: raw,
    };
    if (!seen.has(displayName)) {
      seen.add(displayName);
      existing.push(rec);
      added++;
    } else {
      const idx = existing.findIndex((r) => r.name === displayName);
      if (idx >= 0 && !existing[idx]!.slug) {
        existing[idx] = { ...existing[idx]!, ...rec };
      }
    }
  }

  mkdirSync(MASTER_LIST_DIR, { recursive: true });
  writeFileSync(RAW_IMPORTED_PATH, JSON.stringify(existing, null, 2));
  console.log(`Merged into ${RAW_IMPORTED_PATH} (${existing.length} total, +${added} new)`);

  console.log("Running dedupe/canonical generation...");
  execSync("npm run master-list:dedupe", { cwd: join(__dirname, ".."), stdio: "inherit" });
}

main();
