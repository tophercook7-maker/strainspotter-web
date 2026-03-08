#!/usr/bin/env npx tsx
/**
 * Import raw strain names from external files (.txt, .csv, .json) into the master-list pipeline.
 * Merges into raw_imported_names.json, avoids exact duplicates, then runs dedupe/canonical generation.
 *
 * Usage:
 *   npm run master-list:import -- path/to/file.txt
 *   npm run master-list:import -- path/to/strains.csv
 *   npm run master-list:import -- path/to/export.json
 *   npm run master-list:import -- path/to/file1.txt path/to/file2.csv
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
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

type RawRecord = { name: string; source_file?: string; imported_at?: string };

function parseTxt(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCsv(content: string): string[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  const headers = header.split(/[,;\t]/).map((h) => h.trim());
  const nameCol = headers.findIndex((h) => h.includes("name") || h.includes("strain"));
  const hasHeader = nameCol >= 0 || headers.some((h) => /^(name|strain|id|type)$/.test(h));
  const startRow = hasHeader ? 1 : 0;
  const colIdx = nameCol >= 0 ? nameCol : 0;
  const names: string[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/).map((c) => c.trim());
    const val = cols[colIdx];
    if (val) names.push(val);
  }
  return names;
}

function parseJson(content: string): string[] {
  const parsed = JSON.parse(content) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.map((x) => {
      if (typeof x === "string") return x;
      if (typeof x === "object" && x && "name" in x) return String((x as { name: string }).name);
      if (typeof x === "object" && x && "strain" in x) return String((x as { strain: string }).strain);
      if (typeof x === "object" && x && "strain_name" in x) return String((x as { strain_name: string }).strain_name);
      return String(x);
    });
  }
  if (typeof parsed === "object" && parsed && "names" in parsed) {
    return (parsed as { names: string[] }).names;
  }
  return [];
}

function loadFromFile(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
  if (ext === ".txt") return parseTxt(content);
  if (ext === ".csv") return parseCsv(content);
  if (ext === ".json") return parseJson(content);
  return parseTxt(content);
}

function loadExisting(): RawRecord[] {
  if (!existsSync(RAW_IMPORTED_PATH)) return [];
  const content = readFileSync(RAW_IMPORTED_PATH, "utf-8");
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((x) => {
        if (typeof x === "object" && x && "name" in x) {
          return {
            name: String((x as { name: string }).name),
            source_file: (x as RawRecord).source_file,
            imported_at: (x as RawRecord).imported_at,
          };
        }
        return { name: String(x) };
      });
    }
    if (typeof parsed === "object" && parsed && "names" in parsed) {
      return (parsed as { names: string[] }).names.map((n) => ({ name: n }));
    }
  } catch (_) {}
  return [];
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npm run master-list:import -- <file1> [file2 ...]");
    process.exit(1);
  }

  const existing = loadExisting();
  const seen = new Set<string>(existing.map((r) => r.name));
  const now = new Date().toISOString();
  let added = 0;

  for (const filePath of args) {
    if (!existsSync(filePath)) {
      console.warn(`Skip (not found): ${filePath}`);
      continue;
    }
    const names = loadFromFile(filePath);
    const src = basename(filePath);
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      existing.push({ name: trimmed, source_file: src, imported_at: now });
      added++;
    }
    console.log(`Imported ${names.length} names from ${src}`);
  }

  mkdirSync(MASTER_LIST_DIR, { recursive: true });
  writeFileSync(RAW_IMPORTED_PATH, JSON.stringify(existing, null, 2));
  console.log(`Merged into ${RAW_IMPORTED_PATH} (${existing.length} total, +${added} new)`);

  if (added > 0 || args.length > 0) {
    console.log("Running dedupe/canonical generation...");
    execSync("npm run master-list:dedupe", {
      cwd: join(__dirname, ".."),
      stdio: "inherit",
    });
  }
}

main();
