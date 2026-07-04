# Google Custom Search image fallback — costs & limits

StrainSpotter can optionally call the **Google Custom Search JSON API** (`searchType=image`) when StrainCompass does not return enough exact-match reference URLs. This path is **disabled by default** in `.env.example`; enabling it is explicit (`REFERENCE_IMAGE_SEARCH_PROVIDER=google` plus credentials).

Google hits are written as **low-trust candidates** (`reviewStatus: needs_review_external_search`) for the download / quality / review pipeline — not treated like user-confirmed training data.

## Pricing (Google)

- **100 queries per day free** on the Custom Search JSON API (confirm current terms in [Google’s overview](https://developers.google.com/custom-search/v1/overview)).
- After the free tier, usage is billed at roughly **$5 per 1,000 queries** (verify for your Cloud project).

Runaway scripts could exhaust quota or incur charges. This repo uses **local daily and per-run caps**, **`--confirm-google-cost`** for live runs (when required), and **`data/scanner-training/google-search-usage.json`** so usage stays observable.

## Defaults (this repo)

| Setting | Default | Purpose |
|--------|---------|--------|
| `REFERENCE_IMAGE_SEARCH_PROVIDER` | `off` in examples | Must be `google` to call the API |
| `GOOGLE_SEARCH_DAILY_LIMIT` | `100` | Max API calls recorded per calendar day (local date); aligns with Google’s 100 free/day mindset |
| `GOOGLE_SEARCH_MAX_QUERIES_PER_RUN` | `25` | Max API calls per single auto-feed process |
| `GOOGLE_SEARCH_REQUIRE_CONFIRM` | `true` | Live runs require `--confirm-google-cost` unless you disable this guard |

Each strain may trigger **up to three** HTTP queries when Google fallback runs (three query strings). Limits count **API requests**, not thumbnail URLs returned.

## Setup

```bash
npm run setup:google-image-search
```

Prompts for **GOOGLE_CUSTOM_SEARCH_API_KEY** and **GOOGLE_CUSTOM_SEARCH_CX**, then merges into **`env/.env.local`** (existing keys preserved unless overwritten). Sets **`REFERENCE_IMAGE_SEARCH_PROVIDER=google`**, daily limit **100**, per-run limit **25**, and **`GOOGLE_SEARCH_REQUIRE_CONFIRM=true`**. Keys are **never printed**.

Ensure **`env/.env.local`** is gitignored (the setup script adds `env/.env.local` to `.gitignore` if missing).

## Commands

Safe dry run (no JSONL writes, **no Google quota** consumed; budget line still reflects caps):

```bash
npm run scanner:auto-feed -- --dry-run --limit-strains 10 --target-images 10 --max-new-images 100
```

Live auto-feed with Google (loads `env/.env.local` from the auto-feed script; confirmation required when `GOOGLE_SEARCH_REQUIRE_CONFIRM=true`):

```bash
npm run scanner:auto-feed -- --limit-strains 10 --target-images 10 --max-new-images 100 --confirm-google-cost
```

Full pipeline (wrapper forwards `--confirm-google-cost`, `--limit-strains`, `--target-images`, `--max-new-images` to auto-feed):

```bash
npm run scanner:auto-feed:run -- --limit-strains 10 --target-images 10 --max-new-images 100 --confirm-google-cost
```

Check reference health and Google usage counters:

```bash
npm run scanner:health
```

## Usage file

Local counter: **`data/scanner-training/google-search-usage.json`** (gitignored). Template: **`data/scanner-training/google-search-usage.example.json`**.

## Warnings

- **Attribution & rights:** Google image URLs are third-party; verify **usage rights** and **strain identity** before production redistribution.
- **Quality:** External images need the same **download + quality gate + review** path as other references.

## See also

- `SCANNER_AUTO_FEED_SYSTEM.md` — auto-feed overview  
- `.env.example` — variable names  
