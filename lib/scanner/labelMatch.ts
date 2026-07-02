// lib/scanner/labelMatch.ts
//
// Robust LABEL → catalog matching. The scanner's only route to *correct* strain
// identification is reading a visible name off a package / jar / menu / seed
// packet (image-embedding retrieval is proven near-chance — see ROADMAP Phase 1
// and scripts/recall-ab.mjs). So when OCR yields a name, we must resolve it to
// the 10k catalog even when it's imperfect: plurals, spacing, punctuation, OCR
// typos, brand noise, or embedded in a longer label string.
//
// resolveStrain() (catalog10k) stays the STRICT resolver (exact slug/alias).
// This layer adds normalized-exact → token-containment → bounded fuzzy, each
// with a confidence score so callers can gate how strongly to trust the match.

import { CATALOG_10K, resolveStrain, type CatalogStrain } from "@/lib/data/catalog10k";

export type LabelMatch = {
  strain: CatalogStrain;
  /** 0–1 confidence in the match itself (not in the scan). */
  score: number;
  method: "exact" | "normalized" | "contains" | "fuzzy";
  /** the catalog name/alias text that matched */
  matchedText: string;
};

/** Lowercase, strip accents + punctuation, collapse whitespace. */
export function normalizeLabel(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singularize a trailing plural on the last token ("dreams" -> "dream"). */
function depluralize(norm: string): string {
  return norm.replace(/\b([a-z]{4,})s\b/g, "$1");
}

// Label-noise tokens to ignore when scanning a long OCR string for a name.
// NOTE: strain-relevant words (og, kush, cookies, gelato…) are deliberately NOT
// here — only packaging boilerplate + units.
const NOISE = new Set([
  "the", "strain", "cannabis", "marijuana", "flower", "bud", "buds", "premium",
  "indica", "sativa", "hybrid", "dominant", "thc", "cbd", "cbg", "total",
  "g", "gram", "grams", "oz", "ounce", "mg", "net", "wt", "weight", "eighth",
  "preroll", "pre", "roll", "joint", "vape", "cart", "cartridge", "batch", "lot",
  "lab", "tested", "packaged", "on", "by", "farms", "co", "inc", "llc", "brand",
]);

type Entry = { slug: string; norm: string; tokens: string[]; len: number; text: string; curated: boolean };

/** Tie-break two equally-good matches: prefer curated (the canonical 314),
 *  then the shorter name (canonical "blue dream" over near-dup "blue dreams"). */
function better(a: Entry, b: Entry | null): boolean {
  if (!b) return true;
  if (a.curated !== b.curated) return a.curated;
  return a.len < b.len;
}

// Build match indexes once. Include the canonical name + every alias.
// NORM_EXACT maps a normalized string to the best CANONICAL strain for it.
// "Best" = curated, then the FULLER canonical name — so an abbreviation entry
// (curated "GG4") canonicalizes to the descriptive dup ("Gorilla Glue #4"), and
// a non-curated near-dup ("Blue Dreams") yields to the curated "Blue Dream".
const NORM_EXACT = new Map<string, { slug: string; curated: boolean; nameLen: number }>();
const ENTRIES: Entry[] = []; // for containment + fuzzy (distinctive names only)
function setBestExact(key: string, cand: { slug: string; curated: boolean; nameLen: number }) {
  const ex = NORM_EXACT.get(key);
  const win = !ex
    ? true
    : cand.curated !== ex.curated
      ? cand.curated
      : cand.nameLen > ex.nameLen;
  if (win) NORM_EXACT.set(key, cand);
}
for (const s of CATALOG_10K) {
  for (const text of [s.name, ...(s.aliases ?? [])]) {
    const norm = normalizeLabel(text);
    if (!norm) continue;
    const cand = { slug: s.slug, curated: !!s.curated, nameLen: s.name.length };
    setBestExact(norm, cand);
    const dnorm = depluralize(norm);
    if (dnorm !== norm) setBestExact(dnorm, cand);
    // Only index reasonably distinctive names for fuzzy/containment to avoid
    // matching generic fragments ("og", "kush", "gg").
    if (norm.length >= 5) {
      ENTRIES.push({ slug: s.slug, norm, tokens: norm.split(" "), len: norm.length, text, curated: !!s.curated });
    }
  }
}

const bySlug = new Map(CATALOG_10K.map((s) => [s.slug, s] as const));

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** Is `needle` (token array) a contiguous run inside `hay` (token array)? */
function contiguousContains(hay: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

/**
 * Resolve one candidate string (a model's OCR'd strain name, possibly with
 * label noise) to a catalog strain. Returns the best match or null.
 * Order: strict exact/alias → normalized exact → token containment → fuzzy.
 */
/**
 * Collapse a matched strain to its curated/canonical near-duplicate. The 10k
 * catalog contains dup variants (e.g. both "blue-dream" and "blue-dreams"); a
 * strict exact match can land on the non-curated dup. Map any match through the
 * curated-preferring NORM_EXACT index so the canonical strain wins.
 */
function finalize(
  strain: CatalogStrain,
  score: number,
  method: LabelMatch["method"],
  matchedText: string
): LabelMatch {
  const key = depluralize(normalizeLabel(strain.name));
  const hit = NORM_EXACT.get(key);
  const canon = hit && bySlug.has(hit.slug) ? bySlug.get(hit.slug)! : strain;
  return { strain: canon, score, method, matchedText };
}

export function matchLabelToCatalog(query: string | undefined | null): LabelMatch | null {
  if (!query) return null;
  const raw = String(query).trim();
  if (!raw) return null;

  // 1. strict (exact slug / alias / trailing-qualifier)
  const strict = resolveStrain(raw);
  if (strict) return finalize(strict, 1, "exact", strict.name);

  const norm = normalizeLabel(raw);
  if (!norm) return null;
  const dnorm = depluralize(norm);

  // 2. normalized exact (handles punctuation/spacing/plural)
  for (const key of [norm, dnorm]) {
    const hit = NORM_EXACT.get(key);
    if (hit && bySlug.has(hit.slug)) {
      return finalize(bySlug.get(hit.slug)!, 0.97, "normalized", key);
    }
  }

  // 3. containment — the query (a longer label) contains a catalog name as a
  //    contiguous token run. Prefer the LONGEST such name (most specific).
  const qTokens = dnorm.split(" ").filter((t) => t && !NOISE.has(t));
  if (qTokens.length) {
    let best: Entry | null = null;
    for (const e of ENTRIES) {
      const et = depluralize(e.norm).split(" ");
      if (et.length > qTokens.length) continue;
      // require the name to be distinctive: multi-token, or a single token ≥6 chars
      if (et.length === 1 && et[0].length < 6) continue;
      if (contiguousContains(qTokens, et)) {
        // most-specific (most tokens) wins; tie → curated/canonical
        if (!best || et.length > best.tokens.length ||
            (et.length === best.tokens.length && better(e, best))) best = e;
      }
    }
    if (best) {
      return finalize(bySlug.get(best.slug)!, 0.9, "contains", best.text);
    }
  }

  // 4. fuzzy — OCR typos. Compare the whole normalized query to catalog names
  //    within a length window; accept high similarity only, on names ≥5 chars.
  if (dnorm.length >= 5) {
    let bestScore = 0;
    let bestE: Entry | null = null;
    for (const e of ENTRIES) {
      if (Math.abs(e.len - dnorm.length) > 3) continue; // cheap prefilter
      const enorm = depluralize(e.norm);
      const d = lev(dnorm, enorm);
      const sim = 1 - d / Math.max(dnorm.length, enorm.length);
      if (sim > bestScore + 1e-9 || (Math.abs(sim - bestScore) < 1e-9 && better(e, bestE))) {
        bestScore = sim; bestE = e;
      }
    }
    if (bestScore >= 0.85 && bestE) {
      return finalize(bySlug.get(bestE.slug)!, bestScore, "fuzzy", bestE.text);
    }
  }

  return null;
}

/**
 * Given the model's OCR output, find the single best catalog match. Tries each
 * extracted candidate name, then sliding windows of the raw OCR text (1–4
 * tokens) so a name embedded in a longer label still resolves. Returns the
 * highest-scoring match, or null.
 */
export function bestLabelMatch(
  ocrText: string | undefined | null,
  ocrCandidates: string[] | undefined | null
): LabelMatch | null {
  let best: LabelMatch | null = null;
  const consider = (m: LabelMatch | null) => {
    if (m && (!best || m.score > best.score)) best = m;
  };

  for (const c of ocrCandidates ?? []) consider(matchLabelToCatalog(c));
  if (best && (best as LabelMatch).score >= 0.97) return best; // strong enough, done

  const norm = normalizeLabel(ocrText ?? "");
  if (norm) {
    const toks = norm.split(" ").filter(Boolean);
    for (let w = Math.min(4, toks.length); w >= 1; w--) {
      for (let i = 0; i + w <= toks.length; i++) {
        consider(matchLabelToCatalog(toks.slice(i, i + w).join(" ")));
      }
    }
  }
  return best;
}
