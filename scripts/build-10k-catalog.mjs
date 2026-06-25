// scripts/build-10k-catalog.mjs
//
// Build a curated 10,000-strain catalog from the 35k normalized catalog by
// quality score. The curated 314 (lib/data/strains.json) are always included.
// Output: data/strains-10k.json  (the strain UNIVERSE — for the library, search,
// answer-resolution, and the retrieval candidate set; NOT for inlining into the
// scan prompt, which only ever sees the top-K retrieved candidates).
//
//   node scripts/build-10k-catalog.mjs
import { readFileSync, writeFileSync } from "node:fs";

const TARGET = Number(process.env.TARGET ?? 10000);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const real = (v) =>
  Array.isArray(v) ? v.filter((x) => x && !/^unknown$/i.test(String(x).trim())) : v && !/^unknown$/i.test(String(v).trim()) ? v : null;

const norm = JSON.parse(readFileSync("data/normalized-strain-catalog.json", "utf8"));
const all = Array.isArray(norm) ? norm : norm.strains || Object.values(norm);
const curated = JSON.parse(readFileSync("lib/data/strains.json", "utf8"));
const curatedSlugs = new Set(curated.map((c) => slugify(c.name)));

function score(s) {
  let n = 0;
  if (real(s.type)) n += 3;
  if (real(s.effects)?.length) n += 2;
  if (real(s.flavors)?.length) n += 2;
  if (real(s.lineage)?.length || real(s.lineage)) n += 1;
  if (real(s.aliases)?.length) n += 1;
  if (s.reviewStatus && s.reviewStatus !== "candidate") n += 3;
  if (s.confidence === "high") n += 2;
  else if (s.confidence === "medium") n += 1;
  return n;
}

const shaped = all.map((s) => ({
  slug: s.slug || slugify(s.displayName || ""),
  name: s.displayName || s.slug,
  type: real(s.type) || "unknown",
  lineage: real(s.lineage) || [],
  effects: real(s.effects) || [],
  flavors: real(s.flavors) || [],
  aliases: real(s.aliases) || [],
  curated: curatedSlugs.has(s.slug || slugify(s.displayName || "")),
  _score: score(s),
}));

// Always include curated; fill the rest by score (then name for stable ties).
const must = shaped.filter((s) => s.curated);
const rest = shaped
  .filter((s) => !s.curated)
  .sort((a, b) => b._score - a._score || String(a.name).localeCompare(String(b.name)));
const picked = [...must, ...rest].slice(0, TARGET);

// Dedup by slug, drop the internal score field from output.
const seen = new Set();
const out = [];
for (const s of picked) {
  if (!s.slug || seen.has(s.slug)) continue;
  seen.add(s.slug);
  const { _score, ...rest } = s;
  out.push(rest);
}

writeFileSync("lib/data/strains-10k.json", JSON.stringify(out, null, 0));

const withType = out.filter((s) => s.type !== "unknown").length;
const withEffects = out.filter((s) => s.effects.length).length;
console.log(`Built lib/data/strains-10k.json: ${out.length} strains`);
console.log(`  curated (from 314): ${out.filter((s) => s.curated).length}`);
console.log(`  with known type: ${withType} (${Math.round((withType / out.length) * 100)}%)`);
console.log(`  with effects: ${withEffects} (${Math.round((withEffects / out.length) * 100)}%)`);
console.log(`  min score in set: ${Math.min(...picked.map((s) => s._score))} | sample:`, out.slice(0, 3).map((s) => s.name));
