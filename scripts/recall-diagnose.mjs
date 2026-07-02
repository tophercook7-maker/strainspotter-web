// Is retrieval at chance because embeddings can't separate strains (fundamental)
// or because the reference images are noisy/mislabeled (fixable)? Measures, with
// CLIP-base: mean intra-strain cosine vs mean inter-strain cosine, and the
// nearest-neighbor same-strain rate. Big intra>inter gap = signal exists (data
// fixable); intra≈inter = no strain signal in embedding space (fundamental).
import { readdir } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { pipeline, RawImage } from "@xenova/transformers";

const CACHE = resolve(process.cwd(), "data/strain-reference-images/cache");
const EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX = Number(process.env.MAX_STRAINS ?? 20);
const PER = Number(process.env.REFS_PER_STRAIN ?? 6);

const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

const dirs = (await readdir(CACHE, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !/\s\d+$/.test(d.name));
const strains = [];
for (const d of dirs) {
  const files = (await readdir(join(CACHE, d.name)).catch(() => []))
    .filter((f) => EXT.has(extname(f).toLowerCase())).slice(0, PER).map((f) => join(CACHE, d.name, f));
  if (files.length >= 3) strains.push({ slug: d.name, files });
}
strains.sort((a, b) => b.files.length - a.files.length);
const use = strains.slice(0, MAX);

const extract = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");
const data = [];
for (const s of use) {
  const vecs = [];
  for (const f of s.files) {
    try { const r = await extract(await RawImage.read(f), { pooling: "mean", normalize: true }); vecs.push(Array.from(r.data)); } catch {}
  }
  if (vecs.length >= 2) data.push({ slug: s.slug, vecs });
}

// intra: avg cosine between distinct images of the SAME strain
let intraSum = 0, intraN = 0;
const intraPerStrain = [];
for (const s of data) {
  let sum = 0, n = 0;
  for (let i = 0; i < s.vecs.length; i++) for (let j = i + 1; j < s.vecs.length; j++) { sum += cos(s.vecs[i], s.vecs[j]); n++; }
  intraSum += sum; intraN += n;
  intraPerStrain.push({ slug: s.slug, avg: n ? sum / n : 0, imgs: s.vecs.length });
}
// inter: avg cosine between images of DIFFERENT strains (sampled)
let interSum = 0, interN = 0;
for (let a = 0; a < data.length; a++) for (let b = a + 1; b < data.length; b++)
  for (const va of data[a].vecs) for (const vb of data[b].vecs) { interSum += cos(va, vb); interN++; }

// nearest-neighbor same-strain rate (any image → its single closest other image)
let nn = 0, nnTot = 0;
const flat = data.flatMap((s, si) => s.vecs.map((v) => ({ v, si })));
for (let i = 0; i < flat.length; i++) {
  let best = -Infinity, bestSi = -1;
  for (let j = 0; j < flat.length; j++) { if (i === j) continue; const c = cos(flat[i].v, flat[j].v); if (c > best) { best = c; bestSi = flat[j].si; } }
  nnTot++; if (bestSi === flat[i].si) nn++;
}

const intra = intraSum / intraN, inter = interSum / interN;
console.log(`strains=${data.length}  images=${flat.length}`);
console.log(`mean INTRA-strain cosine: ${intra.toFixed(3)}`);
console.log(`mean INTER-strain cosine: ${inter.toFixed(3)}`);
console.log(`separation (intra - inter): ${(intra - inter).toFixed(3)}   ${intra - inter > 0.08 ? "→ signal exists (data-limited, cleanable)" : "→ ~no strain signal in embeddings (fundamental)"}`);
console.log(`nearest-neighbor same-strain rate: ${(100 * nn / nnTot).toFixed(1)}%  (chance ≈ ${(100 / data.length).toFixed(1)}%)`);
intraPerStrain.sort((a, b) => b.avg - a.avg);
console.log("\nmost self-consistent strains (high intra = coherent refs):");
for (const s of intraPerStrain.slice(0, 5)) console.log(`  ${s.slug.padEnd(24)} intra ${s.avg.toFixed(3)} (${s.imgs} imgs)`);
console.log("least self-consistent (low intra = noisy/mislabeled refs):");
for (const s of intraPerStrain.slice(-5)) console.log(`  ${s.slug.padEnd(24)} intra ${s.avg.toFixed(3)} (${s.imgs} imgs)`);
