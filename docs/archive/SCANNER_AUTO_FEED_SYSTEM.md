# Scanner auto-feed (StrainCompass / TerpScout)

You do **not** need to manually scan hundreds of bud photos to improve the reference library. **Auto-feed** pulls candidate image URLs from StrainCompass/TerpScout only when the API strain name **exactly or strongly matches** the target strain (`lib/strain-data/strainNameMatch`). Rows are appended as **pending** reference records; `references:download` fetches files; the **quality gate** disables obvious problems, marks uncertain rows for review, and resolves ambiguous duplicate API images across strains without deleting metadata.

**Trust order**

1. **User-confirmed scans** (`sourceName: user-confirmed-scan`, promoted via `npm run scanner:training:promote`) remain the highest-trust labels. The quality gate does not disable them for marketing/duplicate heuristics—only for severe issues (missing local file after download, placeholder URL, unusably tiny image).
2. **Auto-fed API rows** (`sourceName: straincompass-auto-feed`, `reviewStatus: api_exact_match`) are medium trust and always carry a license note to verify redistribution rights before production use.
3. Scanner **guesses** are never used as training sources; auto-feed does not learn from prediction output.

**Safety**

- Exact/strong name match only; variant-heavy candidate names are skipped unless the target strain genuinely includes those tokens.
- Dedupe by `strainSlug + imageUrl` and by **SHA-256 after download** (see feeder + quality scripts).
- Cross-strain **exact file duplicates** stay disabled; API-only duplicate clusters keep a single highest-scored attribution when ambiguous (preferring **shorter canonical slugs** when scores tie, e.g. `blue-dream` over `super-blue-dream`).
- **Within-strain** duplicate files (same SHA on disk for one strain): keep one enabled row, disable the rest.
- Ambiguous cross-strain URL reuse and very low-score candidates are logged to `data/strain-reference-images/review-queue.jsonl`.

### Fill scanner library (`scanner:fill`)

**`npm run scanner:fill`** batches the same auto-feed ingestion rules as above, but orders strains using scanner signals (**wrong #1 leaders → almost-correct ranks → confirmation history → weakest popular coverage**). It runs auto-feed once per prioritized strain until a shared `--max-new-images` URL budget is consumed, **then** (unless `--dry-run`) invokes `references:download` → `references:quality` → `references:index` → `references:embeddings` → `scanner:health`. Writes `data/scanner-training/fill-scanner-library-report.json` summarizing queued URLs, download gains, post-quality enabled counts, and gaps.

```bash
npm run scanner:fill -- --dry-run --limit-strains 10 --target-images 10 --max-new-images 200

npm run scanner:fill -- --limit-strains 25 --target-images 10 --max-new-images 200 --sync-supabase

npm run scanner:fill -- --strain "Green Crack" --target-images 10 --max-new-images 80
```

Append **`--confirm-google-cost`** whenever Google fallback is active and **`GOOGLE_SEARCH_REQUIRE_CONFIRM=true`**.

### Optional Google image fallback

When `REFERENCE_IMAGE_SEARCH_PROVIDER=google` and credentials are set, auto-feed may call the Custom Search JSON API after StrainCompass is exhausted (up to **three** queries per strain, capped by daily/per-run limits). Rows use `reviewStatus: needs_review_external_search`, `trustLevel: low`, and `sourceName: google-custom-search`. **`disabled` is false only when title/metadata show strong exact-strain evidence**; weaker hits stay disabled pending review.

**Budget and confirmation:** example env defaults use **100 queries/day** and **25 per run** (configurable); live runs require `--confirm-google-cost` when `GOOGLE_SEARCH_REQUIRE_CONFIRM=true`. See **`SCANNER_GOOGLE_IMAGE_SEARCH_COSTS.md`** and `lib/reference/googleSearchBudget.js`.

## Commands

Dry-run auto-feed (no JSONL writes; still writes `data/scanner-training/auto-feed-report.json`):

```bash
npm run scanner:auto-feed -- --dry-run
```

Safe batch (URLs only), then run the full pipeline yourself:

```bash
npm run scanner:auto-feed -- --limit-strains 25 --target-images 10 --max-new-images 200
```

Full pipeline: auto-feed → download → quality (aborts if **>20%** of enabled refs would be disabled, unless `--force`) → index → embeddings (restores previous embedding index on failure if backup exists) → health:

```bash
npm run scanner:auto-feed:run -- --limit-strains 25 --target-images 10 --max-new-images 200
```

Worst-covered **popular** strains (enabled usable files), default `--limit-strains 15` `--target-images 10` `--max-new-images 150`:

```bash
npm run scanner:auto-feed:weak
npm run scanner:auto-feed:weak -- --dry-run
```

Conservative scheduled-style batch (no `--force` on quality); promotes confirmed scans first:

```bash
npm run scanner:daily
```

Health summary:

```bash
npm run scanner:health
```

Expansion priorities (manual + suggested auto-feed):

```bash
npm run scanner:recommend
```

## Related docs

- `REFERENCE_IMAGE_PIPELINE.md` — download / index / embeddings flow  
- `SCANNER_RECALIBRATION_SYSTEM.md` — calibration overview  
- `EXTERNAL_STRAIN_APIS.md` — StrainCompass/TerpScout setup  
