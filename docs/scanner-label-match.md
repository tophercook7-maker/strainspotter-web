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
3. **compact** — space-less lookup (keys ≥3 chars, blocklist-guarded): repairs
   spacing destroyed by punctuation-stripping or OCR ("GG#4" → "gg 4" → "gg4",
   "BlueDream") — 0.95
4. **confusable** — per-token OCR digit↔letter repair ("B1ue Dream" → "blue
   dream", "Gelato 4l" → "gelato 41"), then exact/compact lookup on the
   repaired string — 0.93
5. **contains** — the query (a longer label) contains a catalog name as a
   contiguous token run; most-specific (most tokens) wins — 0.9
6. **fuzzy** — bounded Levenshtein for OCR typos, accepted only ≥ 0.85 on names
   ≥ 5 chars — score = similarity

Every match is **canonicalized** to the curated/fuller near-duplicate: the 10k
catalog has dup entries (`blue-dream` + `blue-dreams`, `gg4` + `gorilla-glue-4`),
so a raw exact match can land on the wrong one. Preference: curated, then the
fuller canonical name. Non-strain text (`Nutrition Facts`, `Indica Hybrid THC`)
returns null.

`bestLabelMatch(ocrText, ocrCandidates)` tries the model's extracted candidates,
then sliding 1–4-token windows of the raw OCR text, and returns the best.

## Wired into `/api/scan` — `applyLabelMatch`

**DEFAULT ON** (kill switch `SCANNER_LABEL_MATCH=0`). When OCR yields a confident
match (score ≥ 0.9), the matched strain is **promoted to the top candidate** with
`matchSignals.nameInImage = true`, a label-derived confidence (scaled by match
strength), a "read from the label" reasoning, and the summary's primary pick +
headline updated. It merges with (never duplicates) an existing candidate for
the same strain.

Runs **before** calibration so the promoted `nameInImage=true` lands in the
calibration high band (the one stratum where high confidence is earned). Kept out
of `normalizeAnalysis` so eval harnesses still measure raw model behavior.

## Rollout

**DEFAULT ON since 2026-07-03**, together with `SCANNER_CALIBRATION` and
`SCANNER_FREE_NAMING`. Each env var is now a kill switch — set it to `0` to
disable that layer. The deterministic pipeline (promotion → calibration) is
covered end-to-end by `lib/scanner/flagDefaults.pipeline.test.ts`.

## Alias safety — blocklist + vetted supplement

Two guards in `labelMatch.ts`:

- **BLOCKLIST** — ubiquitous label terms (THC, CBD, CBG, BHO, AKA, OG, Kush,
  indica, sativa, hybrid, gram, …) can never resolve to a strain, via any path.
  Real names that *contain* those words still work ("OG Kush" → `og-kush`).
- **SUPPLEMENTAL_ALIASES** — a small, hand-vetted map for famous strains the
  catalog left aliasless: ATF/MTF → alaskan-thunder-fuck, PBB/PB Breath →
  peanut-butter-breath, GDP + spellings → granddaddy-purple, Sour D, ECSD,
  MAC → mac-1, SLH, Skittlez → zkittlez, Maui Waui. Extend **by hand only**.
  Bare "GMO" was deliberately NOT added — "Non-GMO" is real packaging
  boilerplate and a sliding-window hit would misfire.

**Auto-generated initialisms were tried and rejected.** Generating acronyms from
names produced dangerous maps: `THC → tahoe-hydro-champagne`, `BHO`/`AKA` → strains,
and obscure cultivars hijacking famous shorthand (`GDP → grand-doggy-purps`). The
`curated` flag is full of seed-bank crosses, so it didn't isolate "popular." The
existing 103 aliases already cover common shorthand; enrichment must be vetted,
never generated. See `scripts/recall-ab.mjs` note in the commit history.

## Next
- Dedup the catalog's near-duplicate entries at the source (build script), so
  canonicalization isn't load-bearing.
- Pull vetted aliases from the Supabase 35k `strains` table (human-reviewed).
- ~~A small OCR-confusable normalization (0↔O, 1↔l) before fuzzy.~~ ✅ shipped
  (step 4 "confusable", 2026-07-03), plus the compact space-repair path.
