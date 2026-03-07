# Dataset Ops (TheVault)

## Configure

Create a file named `.env.dataset` (do NOT commit it). Copy from `.env.dataset.example` and set `BING_SEARCH_KEY` from Azure.

```
DATASET_ROOT=/Volumes/TheVault/StrainSpotter-Dataset
HERO_ROOT=/Volumes/TheVault/AI-Hero-Images

# Bing Image Search (Azure Cognitive Services) — required for download
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com
BING_SEARCH_KEY=your-azure-bing-key

# Monster dataset safety knobs
DATASET_BING_RPS=2
DATASET_PER_STRAIN_MAX_IMAGES=3
DATASET_IMAGE_MIN_BYTES=25000
DATASET_HTTP_TIMEOUT_MS=15000
DATASET_RETRY_MAX=3
```

## Install

```bash
npm i -D tsx csv-stringify
```

## Run (Audit)

```bash
set -a
source .env.dataset
set +a
npx tsx scripts/dataset/audit.ts
```

Outputs:

- `tmp/dataset/audit.csv`
- `tmp/dataset/audit.json`

## Run (Queue)

```bash
set -a
source .env.dataset
set +a
npx tsx scripts/dataset/build_queue.ts
```

Outputs:

- `tmp/dataset/download_queue.json`

## Run (Scrape-Only – No Downloads)

Collect image candidates (URLs + metadata) without downloading. Free-first (Wikimedia Commons), optional Bing.

```bash
set -a
source .env.dataset
set +a
npx tsx scripts/dataset/build_queue.ts   # if queue doesn't exist
npx tsx scripts/dataset/scrape_only.ts --max-strains=500
```

**CLI / env:**
- `--max-strains=500` — cap strains
- `SCRAPE_CONCURRENCY=10` — worker count (default 10)
- `SCRAPE_OUTPUT_DIR` — default `/Volumes/TheVault/scrape_candidates`
- `FORCE=1` — re-scrape strains that already have candidate files

**Output:**
- `/Volumes/TheVault/scrape_candidates/{slug}.json` — per-strain candidate records
- `/Volumes/TheVault/scrape_candidates/scrape_summary.json` — summary

## Run (Download)

```bash
set -a
source .env.dataset
set +a
npx tsx scripts/dataset/build_queue.ts   # if queue doesn't exist
npx tsx scripts/dataset/download.ts --max-strains=200 --per-strain=2
```

**CLI flags (all optional):**

- `--max-strains=500` — cap strains processed (default: 500)
- `--per-strain=2` — max new images per strain (default: 2)
- `--max-downloads=2000` — hard cap on total downloads (default: 2000)
- `--bing=1` — enable Bing fallback (requires `BING_SEARCH_KEY`; default: 0)

**Provider chain:** Free (Wikimedia Commons) first, then Bing if `--bing=1` and env vars set.

Outputs:

- `tmp/dataset/download_log.jsonl`
- `tmp/dataset/download_summary.json` (processed/skipped/downloaded/provider_hits/failures)

## Provider

`download.ts` uses **Bing Image Search API** (Azure). Create an Azure Cognitive Services Bing Search resource and add `BING_SEARCH_KEY` to `.env.dataset`. Set `BING_SEARCH_ENDPOINT` if using a custom endpoint (default: `https://api.bing.microsoft.com`).

**Smoke test:**
```bash
set -a && source .env.dataset && set +a
node -e "console.log(!!process.env.BING_SEARCH_KEY, process.env.BING_SEARCH_ENDPOINT)"
npx tsx -e "
import { BingImageSearchProvider } from './scripts/dataset/providers/bingImageSearch';
(async () => {
  const p = new BingImageSearchProvider();
  const r = await p.searchImages('Blue Dream cannabis bud photo', 5);
  console.log(r.map(x => x.url));
})();
"
```
