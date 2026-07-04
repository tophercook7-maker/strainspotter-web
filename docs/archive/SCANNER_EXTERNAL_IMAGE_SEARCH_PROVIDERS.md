# External reference image search (Brave, SerpApi, Google)

StrainCompass/TerpScout is the **trusted** source for auto-feed. When exact StrainCompass results are exhausted, optional **external** image search can suggest more URLs. Those hits are **low trust** and always **review-gated** before production use.

## Providers

| Value | Notes |
|-------|--------|
| `off` | Default. No external HTTP search. |
| `brave` | **Recommended** fallback: [Brave Search API](https://api.search.brave.com) image search (`/res/v1/images/search`). |
| `serpapi` | Optional backup: SerpApi `engine=google_images` (paid third-party; set conservative limits). |
| `google` | Kept for compatibility. Often fails with **403 `PERMISSION_DENIED`** if the GCP project does not have Custom Search JSON API access. If you see that error, switch to **`brave`**. |

Set **`REFERENCE_IMAGE_SEARCH_PROVIDER`** to one of: `off`, `google`, `brave`, `serpapi`.  
Keys stay **server-side** only (`env/.env.local`); never commit them or log them.

## Trust and review

External rows are written with:

- `reviewStatus`: `needs_review_external_search`
- `trustLevel`: `low`
- `licenseNote`: text requiring verification of usage rights before redistribution
- `disabled: false` **only** when title/metadata show **strong exact-strain evidence**; otherwise `disabled: true` with `disabledReason: external search result needs review`

`sourceName` is `brave-search`, `serpapi`, or `google-custom-search` depending on provider.

## Costs and limits

- Brave offers **free monthly credits** then paid per request; treatlimits as a safety rail, not a billing guarantee.
- Local counters (gitignored): `data/scanner-training/brave-search-usage.json`, `data/scanner-training/serpapi-search-usage.json`, `data/scanner-training/google-search-usage.json` (templates: `*.example.json`).
- **Dry runs** estimate usage and **do not** increment counters or call external APIs from auto-feed.
- When `*_REQUIRE_CONFIRM=true`, live runs need **`--confirm-search-cost`** or the provider-specific flag (see below).

## Commands

Configure Brave (prompts for key; updates `env/.env.local`):

```bash
npm run setup:brave-image-search
```

Smoke-test the configured provider (never prints keys):

```bash
npm run search:test:reference-images -- "Green Crack"
```

Dry-run fill (no HTTP, budget placeholders):

```bash
npm run scanner:fill -- --dry-run --limit-strains 10 --target-images 10
```

Live fill with Supabase sync and cost confirmation:

```bash
npm run scanner:fill -- --limit-strains 25 --target-images 10 --max-new-images 200 --sync-supabase --confirm-search-cost
```

## Env reference

See `.env.example` and `env/.env.local.example` for:

- `REFERENCE_IMAGE_SEARCH_PROVIDER`
- `BRAVE_SEARCH_API_KEY`, `BRAVE_SEARCH_DAILY_LIMIT`, `BRAVE_SEARCH_MAX_QUERIES_PER_RUN`, `BRAVE_SEARCH_REQUIRE_CONFIRM`
- `SERPAPI_API_KEY`, `SERPAPI_DAILY_LIMIT`, `SERPAPI_MAX_QUERIES_PER_RUN`, `SERPAPI_REQUIRE_CONFIRM`
- Existing Google variables (unchanged)

## Confirm flags

Live runs when confirm is required:

- **Any provider:** `--confirm-search-cost`
- **Google:** `--confirm-google-cost` (or `--confirm-search-cost`)
- **Brave:** `--confirm-brave-cost` (or `--confirm-search-cost`)
- **SerpApi:** `--confirm-serpapi-cost` (or `--confirm-search-cost`)

## Related docs

- `SCANNER_GOOGLE_IMAGE_SEARCH_COSTS.md` — Google-only cost details (may 403 if API not enabled on the project).
- `SCANNER_AUTO_FEED_SYSTEM.md` — auto-feed behavior and queues.
