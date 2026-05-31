#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { referenceJsonlPath, readJsonl, indexPath } = require("./reference-utils");

const root = path.resolve(__dirname, "..");
const POPULAR_PATH = path.join(
  root,
  "data",
  "strain-reference-images",
  "popular-strains.json"
);
const FEEDBACK_PATH = path.join(root, "data", "scan-feedback-local.jsonl");
const CONFIRMED_PATH = path.join(root, "data", "scanner-training", "confirmed-scans.jsonl");
const EMBED_PATH = path.join(
  root,
  "data",
  "strain-reference-images",
  "reference-embedding-index.json"
);

function readJsonlLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function loadPopular() {
  if (!fs.existsSync(POPULAR_PATH)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(POPULAR_PATH, "utf8"));
    return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function enabledRefsWithFiles(rows) {
  return rows.filter((r) => {
    if (r.disabled === true) return false;
    if (!r.localPath) return false;
    return fs.existsSync(path.join(root, r.localPath.split("/").join(path.sep)));
  });
}

function countsBySlug(rows) {
  const m = new Map();
  for (const r of rows) {
    const slug = r.strainSlug || "unknown";
    m.set(slug, (m.get(slug) || 0) + 1);
  }
  return m;
}

function bucketStrains(countMap) {
  const buckets = { zero: [], oneTwo: [], threeNine: [], tenPlus: [] };
  for (const [slug, n] of countMap.entries()) {
    if (n === 0) buckets.zero.push(slug);
    else if (n <= 2) buckets.oneTwo.push(slug);
    else if (n <= 9) buckets.threeNine.push(slug);
    else buckets.tenPlus.push(slug);
  }
  return buckets;
}

function wrongTopFromFeedback(rows) {
  const wrong = new Map();
  for (const row of rows) {
    const w = row.wrongTopMatchSlug;
    if (!w || typeof w !== "string") continue;
    wrong.set(w, (wrong.get(w) || 0) + 1);
  }
  return [...wrong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
}

function main() {
  const refRows = readJsonl(referenceJsonlPath);
  const enabled = enabledRefsWithFiles(refRows);
  const perStrain = countsBySlug(enabled);

  const allSlugs = new Set(perStrain.keys());
  let strainDbSlugs = 0;
  try {
    const strains = JSON.parse(
      fs.readFileSync(path.join(root, "lib", "data", "strains.json"), "utf8")
    );
    if (Array.isArray(strains)) {
      strainDbSlugs = strains.length;
      for (const s of strains) {
        if (s && typeof s.name === "string") {
          const slug = s.name
            .trim()
            .toLowerCase()
            .replace(/['']/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          if (slug) allSlugs.add(slug);
        }
      }
    }
  } catch {
    /* ignore */
  }

  const popular = loadPopular();
  const popularSet = new Set(
    popular.map((n) =>
      String(n)
        .trim()
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
  );

  const coverage = [];
  for (const slug of popularSet) {
    coverage.push({ slug, refs: perStrain.get(slug) || 0 });
  }
  coverage.sort((a, b) => a.refs - b.refs || a.slug.localeCompare(b.slug));
  const worstPopular = coverage.filter((c) => c.refs < 5).slice(0, 12);

  let embeddingRecords = 0;
  let embeddingTotal = 0;
  if (fs.existsSync(EMBED_PATH)) {
    try {
      const e = JSON.parse(fs.readFileSync(EMBED_PATH, "utf8"));
      embeddingRecords = Array.isArray(e.records) ? e.records.length : 0;
      embeddingTotal = Number(e.imageCount || embeddingRecords);
    } catch {
      /* ignore */
    }
  }

  const feedbackRows = readJsonlLines(FEEDBACK_PATH);
  const wrongLeaders = wrongTopFromFeedback(feedbackRows);

  const zeroRefs = [...allSlugs].filter((s) => !perStrain.has(s) || perStrain.get(s) === 0);
  const oneTwo = [...perStrain.entries()].filter(([, n]) => n >= 1 && n <= 2).map(([s]) => s);
  const threeNine = [...perStrain.entries()].filter(([, n]) => n >= 3 && n <= 9).map(([s]) => s);
  const tenPlus = [...perStrain.entries()].filter(([, n]) => n >= 10).map(([s]) => s);

  console.log("=== Scanner / reference health ===\n");
  console.log(`Strains in local DB (approx): ${strainDbSlugs}`);
  console.log(`Distinct strains with ≥1 enabled reference file: ${perStrain.size}`);
  console.log(`Enabled reference images (existing files): ${enabled.length}`);
  console.log(`Embedding records (index): ${embeddingRecords}`);
  console.log(`Embedding imageCount field: ${embeddingTotal}`);
  console.log(`Strains with 0 references (known slugs ∪ DB): ${zeroRefs.length}`);
  console.log(`Strains with 1–2 references: ${oneTwo.length}`);
  console.log(`Strains with 3–9 references: ${threeNine.length}`);
  console.log(`Strains with 10+ references: ${tenPlus.length}`);
  console.log("\n--- Worst-covered popular strains (by popular-strains.json) ---");
  for (const { slug, refs } of worstPopular) {
    console.log(`  ${slug}: ${refs}`);
  }
  console.log("\n--- Most common wrong #1 match (from feedback wrongTopMatchSlug) ---");
  for (const [slug, n] of wrongLeaders) {
    console.log(`  ${slug}: ${n}`);
  }
  console.log("\n--- Recommendations ---");
  console.log(
    "Enrich strains that appear often as wrongTopMatchSlug but have low reference counts;"
  );
  console.log("run: npm run scanner:recommend");
  console.log(`Reference index path present: ${fs.existsSync(indexPath)}`);
}

main();
