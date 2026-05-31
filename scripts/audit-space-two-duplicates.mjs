#!/usr/bin/env node
/**
 * Option B audit: for each "* 2.ts" / "* 2.tsx", find canonical sibling (same path without " 2")
 * and classify: identical | differs | no_canonical
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");

const SKIP = new Set(["node_modules", ".next", ".git"]);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    const rel = relative(root, p);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && (e.name.endsWith(" 2.ts") || e.name.endsWith(" 2.tsx")))
      yield rel;
  }
}

function canonicalPath(rel) {
  if (rel.endsWith(" 2.tsx")) return rel.slice(0, -" 2.tsx".length) + ".tsx";
  if (rel.endsWith(" 2.ts")) return rel.slice(0, -" 2.ts".length) + ".ts";
  return null;
}

const identical = [];
const differs = [];
const noCanonical = [];

for await (const rel of walk(root)) {
  const canon = canonicalPath(rel);
  if (!canon) continue;
  const dupAbs = join(root, rel);
  const canAbs = join(root, canon);
  let st;
  try {
    st = await stat(canAbs);
  } catch {
    noCanonical.push({ duplicate: rel, expected: canon });
    continue;
  }
  if (!st.isFile()) {
    noCanonical.push({ duplicate: rel, expected: canon, reason: "not a file" });
    continue;
  }
  const [a, b] = await Promise.all([readFile(dupAbs), readFile(canAbs)]);
  if (a.length === b.length && a.equals(b)) identical.push(rel);
  else {
    const da = await stat(dupAbs);
    differs.push({
      duplicate: rel,
      canonical: canon,
      duplicateBytes: da.size,
      canonicalBytes: st.size,
    });
  }
}

console.log(JSON.stringify({ identical, differs, noCanonical }, null, 2));
