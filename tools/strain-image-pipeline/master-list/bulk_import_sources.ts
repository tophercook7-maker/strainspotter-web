#!/usr/bin/env npx tsx
/**
 * Bulk import: scan sources/ for raw strain-name files, import all, regenerate canonical outputs once.
 *
 * Usage:
 *   npm run master-list:bulk-import                    # uses master-list/sources/
 *   npm run master-list:bulk-import -- path/to/sources # custom sources dir
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join, dirname, basename, relative } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCES_DIR = join(__dirname, "sources");
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault/strainspotter-vault")
    ? "/Volumes/TheVault/strainspotter-vault"
    : join(__dirname, "../../vault-output"));
const MASTER_LIST_DIR = join(VAULT_ROOT, "master_list");
const RAW_IMPORTED_PATH = join(MASTER_LIST_DIR, "raw_imported_names.json");

const SUPPORTED_EXT = [".txt", ".csv", ".json"];
type RawRecord = { name: string; source_file?: string; imported_at?: string };

function collectFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, base));
    } else if (entry.isFile()) {
      const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
      if (SUPPORTED_EXT.includes(ext)) out.push(full);
    }
  }
  return out.sort();
}

function parseTxt(content: string): string[] {
  return content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}
function parseCsv(content: string): string[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim());
  const nameCol = headers.findIndex((h) => h.includes("name") || h.includes("strain"));
  const hasHeader = nameCol >= 0 || headers.some((h) => /^(name|strain|id|type)$/.test(h));
  const startRow = hasHeader ? 1 : 0;
  const colIdx = nameCol >= 0 ? nameCol : 0;
  const names: string[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const val = lines[i].split(/[,;\t]/).map((c) => c.trim())[colIdx];
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
  if (typeof parsed === "object" && parsed && "names" in parsed) return (parsed as { names: string[] }).names;
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
  try {
    const parsed = JSON.parse(readFileSync(RAW_IMPORTED_PATH, "utf-8")) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((x) =>
        typeof x === "object" && x && "name" in x
          ? { name: String((x as RawRecord).name), source_file: (x as RawRecord).source_file, imported_at: (x as RawRecord).imported_at }
          : { name: String(x) }
      );
    }
    if (typeof parsed === "object" && parsed && "names" in parsed) {
      return (parsed as { names: string[] }).names.map((n) => ({ name: n }));
    }
  } catch (_) {}
  return [];
}

function main() {
  const args = process.argv.slice(2);
  const sourcesDir = args[0] ?? DEFAULT_SOURCES_DIR;
  const files = collectFiles(sourcesDir);
  if (files.length === 0) {
    console.log(`No .txt/.csv/.json files found in ${sourcesDir}`);
    console.log("Drop source files into master-list/sources/ (or subdirs) and run again.");
    process.exit(0);
  }

  const existing = loadExisting();
  const seen = new Set<string>(existing.map((r) => r.name));
  const now = new Date().toISOString();
  let totalAdded = 0;

  for (const filePath of files) {
    const src = relative(sourcesDir, filePath) || basename(filePath);
    const names = loadFromFile(filePath);
    let added = 0;
    for (const name of names) {
      const t = name.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      existing.push({ name: t, source_file: src, imported_at: now });
      added++;
    }
    totalAdded += added;
    console.log(`  ${src}: ${names.length} names, +${added} new`);
  }

  mkdirSync(MASTER_LIST_DIR, { recursive: true });
  writeFileSync(RAW_IMPORTED_PATH, JSON.stringify(existing, null, 2));
  console.log(`Merged into raw_imported_names.json (${existing.length} total, +${totalAdded} new)`);
  console.log("Running dedupe/canonical generation...");
  execSync("npm run master-list:dedupe", { cwd: join(__dirname, ".."), stdio: "inherit" });
}

main();
