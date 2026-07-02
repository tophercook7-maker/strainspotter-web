# Scanner label → catalog matching

> Since image-embedding retrieval is proven near-chance for strain ID, the label
> is the **only** route to *correct* identification. This is how we make it robust.

## Why

A free recall A/B (`scripts/recall-ab.mjs`) + diagnostic (`scripts/recall-diagnose.mjs`)
showed CLIP/SigLIP embeddings of dried flower carry **~zero strain-identity
signal** — recall@1 ≈ chance, intra-strain cosine ≈ inter-strain. No embedder
swap fixes it; strains look near-identical as bud. So specific-strain accuracy
comes down to **reading the name off the label** (package, jar, menu, seed
packet) and resolving it to the catalog — even when the OCR is imperfect.

`resolveStrain()` (catalog10k) was exact-match only, so `Blue Dreams`, `GG#4`,
`Blue Dream 3.5g Sativa`, or an OCR typo like `Blu Dream` failed to resolve.

## The matcher — `lib/scanner/labelMatch.ts`

`matchLabelToCatalog(query)` → `{ strain, score, method }` | null, in order:

1. **exact** (strict slug / alias / trailing-qualifier) — score 1.0
2. **normalized** — lowercase, strip punctuation/accents, collapse, depluralize — 0.97
3. **contains** — the query (a longer label) contains a catalog name as a
   contiguous token run; most-specific (most tokens) wins — 0.9
4. **fuzzy** — bounded Levenshtein for OCR typos, accepted only ≥ 0.85 on names
   ≥ 5 chars — score = similarity

Every match is **canonicalized** to the curated/fuller near-duplicate: the 10k
catalog has dup entries (`blue-dream` + `blue-dreams`, `gg4` + `gorilla-glue-4`),
so a raw exact match can land on the wrong one. Preference: curated, then the
fuller canonical name. Non-strain text (`Nutrition Facts`, `Indica Hybrid THC`)
returns null.

`bestLabelMatch(ocrText, ocrCandidates)` tries the model's extracted candidates,
then sliding 1–4-token windows of the raw OCR text, and returns the best.

## Wired into `/api/scan` — `applyLabelMatch`

Flag-gated `SCANNER_LABEL_MATCH=1` (default off). When OCR yields a confident
match (score ≥ 0.9), the matched strain is **promoted to the top candidate** with
`matchSignals.nameInImage = true`, a label-derived confidence (scaled by match
strength), a "read from the label" reasoning, and the summary's primary pick +
headline updated. It merges with (never duplicates) an existing candidate for
the same strain.

Runs **before** calibration so the promoted `nameInImage=true` lands in the
calibration high band (the one stratum where high confidence is earned). Kept out
of `normalizeAnalysis` so eval harnesses still measure raw model behavior.

## Rollout

Default off. Turn on with `SCANNER_LABEL_MATCH=1`, verify on a few real labeled
photos, then make default — same pattern as `SCANNER_CALIBRATION` /
`SCANNER_FREE_NAMING`.

## Next
- Enrich catalog aliases (only 103 / 10,000 strains have any) — more aliases =
  more label variants resolve.
- Dedup the catalog's near-duplicate entries at the source (build script), so
  canonicalization isn't load-bearing.
- Consider a small OCR-confusable normalization (0↔O, 1↔l) before fuzzy.
