# Auto-review: external reference candidates

This pipeline **does not** blindly trust image search. Rows are only auto-approved when multiple **hard checks** pass together with a high score: the **exact strain phrase** must appear in metadata, the **image URL** must be valid, there must be **no variant/cross/autoflower mismatch** versus the catalog strain name, **no seed-pack/logo/packaging** style signals, **no cross-strain duplicate `contentHash`**, and any **downloaded** file must be at least **300×300** pixels.

Auto-rejection uses symmetric **hard rejects** (invalid URL, dimensions under 200×200 when known, obvious commerce/junk signals, duplicate hashes across strains, clear cross-strain titles) or a score at or below the reject threshold.

Everything in between is labeled **`needs_human_review_external`** (disabled, needs a human decision).

## Safety

- Before writing `reference-images.jsonl`, the script copies  
  `data/strain-reference-images/reference-images.backup-before-auto-external-review.jsonl`.
- A JSON report is written to  
  `data/strain-reference-images/review/auto-review-external-report.json` (the `review/` tree is gitignored).

## Commands

Dry-run (no file mutations):

```bash
npm run references:auto-review:external -- --dry-run
```

Apply auto decisions (defaults: approve ≥ 85, reject ≤ 35, limit 100):

```bash
npm run references:auto-review:external
```

Useful flags:

- `--limit 200`
- `--approve-threshold 85`
- `--reject-threshold 35`
- `--only-strain "Green Crack"`
- `--write-report false` (skip writing the JSON report)

Full external pipeline (optional fetch → download → auto-review → quality → index → embeddings → health → optional Supabase):

```bash
npm run scanner:external:auto-pipeline -- --fetch-new --limit-strains 25 --target-images 10 --max-new-images 200 --confirm-search-cost --sync-supabase
```

Preview review only in that pipeline:

```bash
npm run scanner:external:auto-pipeline -- --dry-run-review
```

## Supabase

`npm run supabase:sync:references` treats **`approved_external_auto`** like **`approved_external_exact`** for external sources, when rows are enabled, **`status: downloaded`**, `localPath` + **`contentHash`** present, and the local file exists. Rows still in **`needs_review_external_search`** or **`needs_human_review_external`** are never synced.
