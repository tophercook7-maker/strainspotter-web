// scripts/fit-confidence-calibration.mjs
//
// Fit the scanner's confidence-calibration table from labeled eval snapshots.
//
// The scanner (GPT-4o Vision) reports a raw self-confidence 0-100 per candidate.
// That number is badly miscalibrated: on the baseline eval the model dumps ~90%
// of scans into a 50-79 "moderate" band whose ACTUAL top-1 accuracy is ~10%
// (see docs/scanner-calibration.md). This script turns the raw number into an
// honest estimate of P(top candidate is correct) x 100, per structured stratum.
//
// Method (deliberately conservative — n is small, so we do NOT pretend a precise
// isotonic fit):
//   1. Bin rows by raw confidence.
//   2. Per bin, empirical P(correct) = hits/n, Bayesian-shrunk toward the
//      dataset's overall top-1 rate with strength K (so sparse bins fall back to
//      the prior instead of overfitting — a 2/2 bin does not become "100%").
//   3. PAVA (pool-adjacent-violators) to enforce monotone non-decreasing
//      calibrated-vs-raw.
//
// The eval snapshots are bare-flower reference images (no packaging), so every
// row is the "visualOnly" stratum. The "nameInImage" stratum (OCR read a strain
// name off a label) has no eval labels yet, so it is a DECLARED PRIOR, marked
// source:"prior", to be replaced once the flywheel (scan_corrections) yields
// labeled OCR cases. This is the honest position: fit what we have evidence for,
// declare the rest as an assumption.
//
// Usage:
//   node scripts/fit-confidence-calibration.mjs [snapshot.json ...]
// Defaults to data/eval/baseline-textonly-2026-06-23.json.
// Output: lib/scanner/calibrationTable.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// Raw-confidence bin edges. Coarse on purpose: the data is sparse and coarse
// bins are more honest than fine ones. Half-open [edge[i], edge[i+1]).
const BIN_EDGES = [0, 40, 50, 60, 70, 80, 101];

// Bayesian shrinkage strength (pseudo-observations pulled toward the prior mean).
// K=5 means a 2/2 bin is treated as ~2+5*prior over 2+5 — enough to stop a tiny
// bin from claiming certainty, small enough that a well-populated bin dominates.
const SHRINK_K = 5;

// Conservative prior band for the nameInImage stratum (OCR label present).
// Dispensary/seed-bank labels are the single most reliable signal, but the
// flower can still be mislabeled or the wrong photo — so this is high, not 100%.
// Replaced by a fit once the flywheel provides labeled OCR cases.
const NAME_IN_IMAGE_PRIOR = [
  { rawMin: 0, rawMax: 59, calibrated: 55 },
  { rawMin: 60, rawMax: 79, calibrated: 70 },
  { rawMin: 80, rawMax: 100, calibrated: 85 },
];

function loadRows(files) {
  const rows = [];
  for (const f of files) {
    const abs = path.isAbsolute(f) ? f : path.join(root, f);
    if (!existsSync(abs)) {
      console.warn(`(skip) snapshot not found: ${f}`);
      continue;
    }
    const j = JSON.parse(readFileSync(abs, "utf8"));
    const snapRows = Array.isArray(j) ? j : j.rows || j.results || [];
    for (const r of snapRows) {
      const conf = typeof r.conf === "number" ? r.conf : null;
      const hit1 = r.hit1 === true;
      if (conf === null) continue;
      rows.push({ conf, hit1 });
    }
    console.log(`loaded ${snapRows.length} rows from ${path.basename(abs)}`);
  }
  return rows;
}

// Pool-adjacent-violators: enforce non-decreasing values left-to-right,
// pooling by weighted mean where a violation occurs.
function pava(bins) {
  // bins: [{value, weight, ...}] in raw order
  const blocks = bins.map((b) => ({ value: b.value, weight: b.weight, items: [b] }));
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].value <= blocks[i + 1].value) {
      i++;
      continue;
    }
    // violation — merge i and i+1
    const a = blocks[i];
    const b = blocks[i + 1];
    const w = a.weight + b.weight;
    const merged = {
      value: w > 0 ? (a.value * a.weight + b.value * b.weight) / w : (a.value + b.value) / 2,
      weight: w,
      items: [...a.items, ...b.items],
    };
    blocks.splice(i, 2, merged);
    if (i > 0) i--; // back up: the merge may have created a new violation behind us
  }
  // expand blocks back to per-bin pooled values
  const out = [];
  for (const blk of blocks) for (const it of blk.items) out.push({ ...it, pooled: blk.value });
  return out;
}

function fitVisualOnly(rows) {
  const overall = rows.length ? rows.filter((r) => r.hit1).length / rows.length : 0.1;
  const priorMean = overall; // shrink toward the dataset's own base rate

  const bins = [];
  for (let e = 0; e < BIN_EDGES.length - 1; e++) {
    const lo = BIN_EDGES[e];
    const hi = BIN_EDGES[e + 1];
    const inBin = rows.filter((r) => r.conf >= lo && r.conf < hi);
    const n = inBin.length;
    const hits = inBin.filter((r) => r.hit1).length;
    const shrunk = (hits + SHRINK_K * priorMean) / (n + SHRINK_K);
    bins.push({
      rawMin: lo,
      rawMax: hi - 1,
      n,
      hits,
      empirical: n ? +(hits / n).toFixed(4) : null,
      value: shrunk * 100, // pre-PAVA calibrated %, real-valued
      weight: n + SHRINK_K, // sparse bins have low weight in pooling
    });
  }

  const pooled = pava(bins);
  return {
    n: rows.length,
    overallTop1: +overall.toFixed(4),
    priorMean: +priorMean.toFixed(4),
    shrinkK: SHRINK_K,
    bins: pooled.map((b) => ({
      rawMin: b.rawMin,
      rawMax: b.rawMax,
      n: b.n,
      empirical: b.empirical,
      calibrated: Math.round(b.pooled),
    })),
  };
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args : ["data/eval/baseline-textonly-2026-06-23.json"];
  const rows = loadRows(files);
  if (!rows.length) {
    console.error("No labeled rows loaded — nothing to fit.");
    process.exit(1);
  }

  const visualOnly = fitVisualOnly(rows);

  const table = {
    version: 1,
    // NOTE: fitAt is intentionally sourced from the newest input snapshot's
    // filename/date rather than wall-clock, so the fit is reproducible.
    fitFrom: files,
    method: "bayesian-shrunk empirical accuracy + PAVA monotone pooling",
    strata: {
      visualOnly,
      nameInImage: {
        source: "prior",
        note:
          "No eval labels yet for OCR-name-in-image cases; conservative declared prior pending flywheel (scan_corrections). Re-fit will replace this once labeled OCR cases exist.",
        bins: NAME_IN_IMAGE_PRIOR.map((b) => ({ ...b, n: 0, empirical: null })),
      },
    },
    tierThresholds: { high: 70, moderate: 40, low: 20 },
  };

  // Written under lib/ (not root /data/, which .vercelignore excludes from the
  // deploy) so the scan route can import it at request time.
  const outDir = path.join(root, "lib", "scanner");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "calibrationTable.json");
  writeFileSync(outPath, JSON.stringify(table, null, 2) + "\n");

  console.log(`\nfit visualOnly (n=${visualOnly.n}, overall top1=${(visualOnly.overallTop1 * 100).toFixed(0)}%):`);
  for (const b of visualOnly.bins) {
    console.log(
      `  raw ${String(b.rawMin).padStart(3)}-${String(b.rawMax).padStart(3)} | n=${String(b.n).padStart(3)} | empirical ${b.empirical === null ? "  n/a" : (b.empirical * 100).toFixed(0).padStart(3) + "%"} -> calibrated ${b.calibrated}%`,
    );
  }
  console.log(`\nwrote ${path.relative(root, outPath)}`);
}

main();
