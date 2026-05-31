#!/usr/bin/env node

/**
 * Suggest strains to enrich with exact references using feedback + coverage + popularity.
 */

const fs = require("node:fs");
const path = require("node:path");
const { referenceJsonlPath, readJsonl } = require("./reference-utils");

const root = path.resolve(__dirname, "..");
const POPULAR_PATH = path.join(
  root,
  "data",
  "strain-reference-images",
  "popular-strains.json"
);
const FEEDBACK_PATH = path.join(root, "data", "scan-feedback-local.jsonl");
const CONFIRMED_PATH = path.join(root, "data", "scanner-training", "confirmed-scans.jsonl");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function enabledRefCounts() {
  const rows = readJsonl(referenceJsonlPath);
  const m = new Map();
  for (const r of rows) {
    if (r.disabled === true) continue;
    if (!r.localPath) continue;
    const abs = path.join(root, r.localPath.split("/").join(path.sep));
    if (!fs.existsSync(abs)) continue;
    const slug = r.strainSlug || "unknown";
    m.set(slug, (m.get(slug) || 0) + 1);
  }
  return m;
}

function loadPopularSlugs() {
  if (!fs.existsSync(POPULAR_PATH)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(POPULAR_PATH, "utf8"));
    if (!Array.isArray(j)) return [];
    return j.map((n) => slugify(n)).filter(Boolean);
  } catch {
    return [];
  }
}

function scoreSort(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return a.slug.localeCompare(b.slug);
}

function main() {
  const refCounts = enabledRefCounts();
  const popular = loadPopularSlugs();
  const popularSet = new Set(popular);

  const feedback = readJsonlLines(FEEDBACK_PATH);
  const confirmed = readJsonlLines(CONFIRMED_PATH);

  const wrongLeaderCounts = new Map();
  const correctedCounts = new Map();
  const almostFirst = new Map();

  for (const row of feedback) {
    const correct =
      row.correctStrainSlug ||
      row.selectedMatchSlug ||
      (row.correctedStrainName ? slugify(row.correctedStrainName) : "");
    if (correct) correctedCounts.set(correct, (correctedCounts.get(correct) || 0) + 1);

    const w = row.wrongTopMatchSlug;
    if (w && typeof w === "string") {
      wrongLeaderCounts.set(w, (wrongLeaderCounts.get(w) || 0) + 1);
    }

    const top = Array.isArray(row.topMatches) ? row.topMatches : row.predictedTopMatches;
    if (!correct || !Array.isArray(top)) continue;
    const sorted = [...top].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    const rank1 = sorted[0];
    const hit = sorted.find((m) => m && m.slug === correct);
    if (
      hit &&
      rank1 &&
      rank1.slug &&
      hit.slug &&
      rank1.slug !== hit.slug &&
      (hit.rank === 2 || hit.rank === 3)
    ) {
      almostFirst.set(correct, (almostFirst.get(correct) || 0) + 1);
    }
  }

  for (const row of confirmed) {
    const slug = row.correctStrainSlug;
    if (slug) correctedCounts.set(slug, (correctedCounts.get(slug) || 0) + 1);
  }

  const candidates = new Map();

  function add(slug, points, reason) {
    if (!slug) return;
    const cur = candidates.get(slug) || { slug, score: 0, reasons: [] };
    cur.score += points;
    cur.reasons.push(reason);
    candidates.set(slug, cur);
  }

  for (const [slug, n] of wrongLeaderCounts.entries()) {
    const refs = refCounts.get(slug) || 0;
    if (refs < 10) add(slug, Math.min(8, n * 2), `wrong #1 leader ×${n}, refs=${refs}`);
  }

  for (const [slug, n] of almostFirst.entries()) {
    const refs = refCounts.get(slug) || 0;
    if (refs < 10) add(slug, Math.min(6, n * 2), `correct in top 3 not #1 ×${n}, refs=${refs}`);
  }

  for (const [slug, n] of correctedCounts.entries()) {
    const refs = refCounts.get(slug) || 0;
    if (refs < 10) add(slug, Math.min(5, n), `confirmed in feedback ×${n}, refs=${refs}`);
  }

  for (const slug of popularSet) {
    const refs = refCounts.get(slug) || 0;
    if (refs < 10) add(slug, refs === 0 ? 4 : 2, `popular list, refs=${refs}`);
  }

  const ranked = [...candidates.values()].sort(scoreSort).slice(0, 40);

  console.log("=== Reference expansion recommendations ===\n");
  console.log("(Prioritize exact, strain-specific bud photos — not marketing collage.)\n");
  for (const row of ranked) {
    console.log(`- ${row.slug}  [score ${row.score}]`);
    for (const r of row.reasons.slice(0, 4)) {
      console.log(`    • ${r}`);
    }
  }
  if (!ranked.length) {
    console.log("No signals yet — add scan feedback or confirmed training rows first.");
  }
  console.log("\nNext steps: npm run references:add:exact / references:enrich:strain");
}

main();
