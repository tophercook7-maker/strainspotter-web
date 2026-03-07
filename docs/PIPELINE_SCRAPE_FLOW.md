# Pipeline Scraper Flow

## Verification (Pipeline Control Dashboard)

1. **Start scraper** from the Tauri app ("Start Scraper").
2. **Confirm UI shows:**
   - `scraper_pid` (Process ID)
   - `scraper_status` running
   - Last activity time updating from `vault_scrape.log`
3. **Confirm `hero_state.json` read frequency is reduced** — logs should not spam "Reading hero state" every poll. The Rust backend caches hero state and refreshes at most every 3 seconds.
4. **Scraper log** — Output goes to `/Volumes/TheVault/vault_scrape.log`. The backend tails this file incrementally (no full re-read) to extract `strains_processed`, `queries_sent`, `candidates_found`, `errors_count`, `last_activity_at`.

## Quick: Run Scrape-Only from CLI

```bash
set -a
source .env.dataset
set +a
npx tsx scripts/dataset/build_queue.ts   # if queue doesn't exist
npx tsx scripts/dataset/scrape_only.ts --max-strains=100
```

**Output:** `/Volumes/TheVault/scrape_candidates/{slug}.json` per strain, plus `scrape_summary.json`.

**Verify:**
```bash
# List first 5 strain files
ls /Volumes/TheVault/scrape_candidates | head -5

# Show first 500 chars of one strain's candidates
head -c 500 /Volumes/TheVault/scrape_candidates/blue-dream.json

# Count files (strains) and total candidate records
ls /Volumes/TheVault/scrape_candidates/*.json 2>/dev/null | wc -l
cat /Volumes/TheVault/scrape_candidates/scrape_summary.json | jq '.scrapedStrains, .totalCandidates'

# First 3 output lines (first strain file, pretty)
head -1 /Volumes/TheVault/scrape_candidates/*.json 2>/dev/null | head -1 | jq .
```

---

## What Happens When You Click "Start Scraper"

### Architecture Overview

There are two scraper flows in the project:

| Flow | Trigger | Runner | State Files |
|------|---------|--------|-------------|
| **Tauri desktop app** | "Start Scraper" in Pipeline Control | Rust backend spawns child process | `hero_state.json` on TheVault, scraper state |
| **Shell / Node** | `./start_pipeline.sh` | `node tools/image_scraper_v2.mjs` | `pipeline-control/state.json` |

### Tauri Desktop App Flow (your current setup)

1. **Frontend** (`pipeline-control/src/App.tsx`)
   - Calls `invoke("start_scraper")` when you click "Start Scraper"
   - Calls `invoke("get_status")` every **2 seconds** via `setInterval(refreshStatus, 2000)`

2. **Backend** (Rust in `pipeline-control/src-tauri/src/`)
   - `start_scraper` command: spawns a child process (Node scraper or Rust binary)
   - `get_status` command: reads status from disk and returns it
   - Your logs show: `[RUST] get_status called` → `[RUST] Reading hero state from: /Volumes/TheVault/hero_state.json` → `[RUST] Hero state parsed: index=0` → `[RUST] Hero progress: 0/35550`

3. **What runs**
   - The Rust binary invokes some scraper process (exact binary/script depends on your Tauri config)
   - Hero progress (`0/35550`) comes from `/Volumes/TheVault/hero_state.json`
   - Scraper progress (`scraper_progress`) likely comes from another file or the spawned process
   - **Scrape-only:** The UI has a "Scrape only (no downloads)" toggle. When checked, `start_scraper` is invoked with `{ scrapeOnly: true }`. The Rust backend should spawn the Node `scrape_only.ts` script instead of the full scraper. Until the backend is updated, use the CLI: `npx tsx scripts/dataset/scrape_only.ts`

4. **State read/write locations**
   - **Hero:** `/Volumes/TheVault/hero_state.json` (generated/processed index, total)
   - **Scraper:** Likely `pipeline-control/state.json` or a scraper-specific file
   - **Logs:** iTerm shows Rust logs; scraper writes to its own logs

5. **Where results go during scrape**
   - Depends on the spawned scraper:
     - `image_scraper_v2.mjs`: `canonical_queries.json`, `image_pool.json`, `strain_images.json`, progress JSON files
     - `scripts/dataset/download.ts`: writes to `buds/` folders and `tmp/dataset/download_log.jsonl`

---

## Why is `get_status` Repeatedly Reading `hero_state.json`?

Because the Rust implementation reads the file **on every `get_status` call**. The frontend calls `get_status` every 2 seconds, so the file is read ~30 times per minute, causing disk thrash.

---

## What Code Triggers `get_status` and at What Interval?

**Frontend:** `pipeline-control/src/App.tsx` lines 57–61:

```tsx
useEffect(() => {
  refreshStatus();
  const interval = setInterval(refreshStatus, 2000); // every 2 seconds
  return () => clearInterval(interval);
}, []);
```

`refreshStatus` calls `invoke("get_status")`, so the Tauri backend receives a `get_status` request every 2 seconds.

---

## Simplest Refactor to Stop Disk Thrash and Speed Up Scrape-Only

### 1. Backend (Rust) – cache hero state

- Keep `hero_state.json` in memory.
- Refresh from disk only every 3–5 seconds (or when `hero_state.json` is known to have changed).
- Avoid reading the file on every `get_status` call.

### 2. Frontend – less frequent polling

- Increase interval to 3–5 seconds.
- Add backoff when no progress (e.g. double interval when idle).
- Example: start at 2s; if no change for 3 polls, use 5s; reset when progress changes.

### 3. Use the standalone scrape-only script

- Run `scripts/dataset/scrape_only.ts` instead of the full pipeline for scrape-only runs.
- It does not depend on the Tauri app, avoids hero_state.json, and uses its own state/output paths.

---

## Node/TS Scraper Scripts (Alternative Flow)

| Script | Purpose |
|--------|---------|
| `scripts/dataset/build_queue.ts` | Builds `tmp/dataset/download_queue.json` from strain dirs |
| `scripts/dataset/download.ts` | Downloads images via FreeScrape + optional Bing |
| `scripts/dataset/scrape_only.ts` | Scrape-only: collects candidates, no downloads |

Use `scrape_only.ts` for fast candidate collection without downloading images.
