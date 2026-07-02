// scripts/recall-ab.mjs
//
// FREE retrieval-recall A/B: does a stronger image embedder separate cannabis
// strains better than CLIP-base? Recall is THE lever (ROADMAP Phase 1) — top-1
// ID is gated by whether the right strain is even in the retrieved shortlist.
//
// Pure embeddings + cosine, leave-one-out over the real reference cache. No
// OpenAI / no cost. For each model:
//   - embed every reference image (mean-pooled, L2-normalized)
//   - for each query image, score every OTHER strain by its best cosine to any
//     of that strain's *other* images; rank strains; is the true strain top-1/top-3?
//
// Usage:
//   node scripts/recall-ab.mjs [model1 model2 ...]
// Defaults compare CLIP-base vs CLIP-large vs SigLIP-base.
// Knobs: MAX_STRAINS, REFS_PER_STRAIN, MIN_IMGS (env).

import { readdir } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { pipeline, RawImage } from "@xenova/transformers";

const ROOT = resolve(process.cwd());
const CACHE = join(ROOT, "data/strain-reference-images/cache");
const EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_STRAINS = Number(process.env.MAX_STRAINS ?? 0) || Infinity; // 0 = all
const REFS_PER_STRAIN = Number(process.env.REFS_PER_STRAIN ?? 6);
const MIN_IMGS = Number(process.env.MIN_IMGS ?? 2);

const MODELS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["Xenova/clip-vit-base-patch32", "Xenova/clip-vit-large-patch14", "Xenova/siglip-base-patch16-224"];

async function collect() {
  const dirs = (await readdir(CACHE, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !/\s\d+$/.test(d.name));
  const strains = [];
  for (const d of dirs) {
    const base = join(CACHE, d.name);
    let files = [];
    for (const sub of [base, join(base, "buds")]) {
      try {
        const fs = await readdir(sub);
        files.push(...fs.filter((f) => EXT.has(extname(f).toLowerCase())).map((f) => join(sub, f)));
      } catch { /* no subdir */ }
    }
    if (files.length >= MIN_IMGS) strains.push({ slug: d.name, files: files.slice(0, REFS_PER_STRAIN) });
  }
  strains.sort((a, b) => b.files.length - a.files.length);
  return strains.slice(0, MAX_STRAINS);
}

function cos(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

async function embedAll(model, strains) {
  const extract = await pipeline("image-feature-extraction", model);
  const out = []; // { slug, vecs: number[][] }
  let n = 0, t0 = Date.now();
  for (const s of strains) {
    const vecs = [];
    for (const f of s.files) {
      try {
        const img = await RawImage.read(f);
        const r = await extract(img, { pooling: "mean", normalize: true });
        vecs.push(Array.from(r.data));
        n++;
      } catch (e) { /* skip unreadable */ }
    }
    if (vecs.length) out.push({ slug: s.slug, vecs });
  }
  console.log(`    embedded ${n} imgs in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return out;
}

function recall(data) {
  // leave-one-out: query = one image; candidates = every strain's best cos to any
  // OTHER image (for the query's own strain, exclude the query image itself).
  let q = 0, hit1 = 0, hit3 = 0;
  for (let si = 0; si < data.length; si++) {
    const s = data[si];
    for (let qi = 0; qi < s.vecs.length; qi++) {
      const query = s.vecs[qi];
      const scores = [];
      for (let ti = 0; ti < data.length; ti++) {
        const t = data[ti];
        let best = -Infinity;
        for (let vj = 0; vj < t.vecs.length; vj++) {
          if (ti === si && vj === qi) continue; // exclude self
          const c = cos(query, t.vecs[vj]);
          if (c > best) best = c;
        }
        if (best > -Infinity) scores.push({ slug: t.slug, score: best });
      }
      scores.sort((a, b) => b.score - a.score);
      const rank = scores.findIndex((x) => x.slug === s.slug);
      q++;
      if (rank === 0) hit1++;
      if (rank >= 0 && rank < 3) hit3++;
    }
  }
  return { q, top1: hit1 / q, top3: hit3 / q };
}

async function main() {
  const strains = await collect();
  const imgTotal = strains.reduce((a, s) => a + s.files.length, 0);
  console.log(`dataset: ${strains.length} strains, ${imgTotal} images (>=${MIN_IMGS} imgs, <=${REFS_PER_STRAIN}/strain)\n`);
  const results = [];
  for (const model of MODELS) {
    console.log(`▶ ${model}`);
    try {
      const data = await embedAll(model, strains);
      const r = recall(data);
      results.push({ model, ...r });
      console.log(`    recall@1 ${(r.top1 * 100).toFixed(1)}%  recall@3 ${(r.top3 * 100).toFixed(1)}%  (n=${r.q})\n`);
    } catch (e) {
      console.log(`    FAILED: ${e.message}\n`);
      results.push({ model, error: e.message });
    }
  }
  console.log("=== SUMMARY (higher recall = better shortlist = higher top-1 ID) ===");
  for (const r of results) {
    console.log(r.error ? `  ${r.model}: ERROR ${r.error}`
      : `  ${r.model.padEnd(38)} r@1 ${(r.top1 * 100).toFixed(1)}%  r@3 ${(r.top3 * 100).toFixed(1)}%`);
  }
}

main();
