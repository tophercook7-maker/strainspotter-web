# Canonical Query Generation + Worker Queue — COMPLETE

## Part 1: Canonical Query Generation ✅

### Enhancements

1. **Normalization Function**
   - Lowercase all queries
   - Trim whitespace
   - Remove special characters (keep alphanumeric, spaces, hyphens)
   - Normalize multiple spaces to single space

2. **Generic Parent Filtering**
   - Skips generic terms: `indica`, `sativa`, `hybrid`, `ruderalis`, `unknown`, `n/a`, `none`, `landrace`, `pure`
   - Only includes meaningful parent strain names

3. **Source Tracking**
   - Each query includes `source` field: `"strain_name"`, `"alias"`, or `"parent"`
   - Tracks which strains use each query (for assignment layer)

4. **Aggressive Deduplication**
   - Uses `Set` to prevent duplicate queries
   - Merges strains when duplicate queries found

5. **Size Limiting**
   - Caps at 4,000 queries max (target: 2,000–4,000)
   - Prioritizes strain names, then aliases, then parents

6. **Persistence**
   - Queries saved to `canonical_queries.json`
   - **NOT regenerated** on subsequent runs (only if file missing)

### Output Format

```json
[
  {
    "query": "blue dream weed",
    "source": "strain_name",
    "strains": ["blue-dream"]
  },
  {
    "query": "og kush weed",
    "source": "parent",
    "strains": ["blue-dream", "another-strain"]
  }
]
```

## Part 2: Worker Queue for Harvesting ✅

### Enhancements

1. **Canonical Progress Tracking**
   - New file: `canonical_progress.json`
   - Tracks: `completed_queries`, `total_queries`, `last_updated`
   - Updated immediately after each query completes

2. **Enhanced Worker Queue**
   - Reuses existing `scrapeDuckDuckGo()` function
   - Max concurrency: 20 workers (configurable)
   - Global rate limiter: 1.5s delay between requests
   - Each worker:
     - Pops one canonical query
     - Scrapes images with retry logic
     - Writes results to `image_pool.json`
     - Flushes progress immediately

3. **Retry Logic**
   - Up to 3 retries per query (configurable)
   - Exponential backoff with delay
   - Failed queries logged but don't stop workers

4. **Failure Handling**
   - One failed query does NOT stop other workers
   - Failed queries tracked in `failedQueryList`
   - Saved to `failed_queries.json` for review
   - Progress still updated even on failure

5. **Resume Support**
   - On restart: skips completed queries
   - Resumes from `progress_harvest.json`
   - Progress synced with `canonical_progress.json`

### Progress Files

- `canonical_progress.json`: Overall progress tracking
- `progress_harvest.json`: Detailed harvest progress (index-based)
- `failed_queries.json`: List of queries that failed after max retries

### Worker Queue Flow

```
1. Load canonical_queries.json
2. Check progress_harvest.json for resume point
3. Initialize canonical_progress.json
4. For each query (starting from resume point):
   - Wait for available worker slot
   - Start worker:
     - Scrape DuckDuckGo (with retries)
     - Append to image_pool.json
     - Update progress immediately
     - Rate limit (1.5s delay)
5. Wait for all workers to complete
6. Save final progress and state
```

## Success Criteria ✅

- ✅ `canonical_queries.json` generated once (not regenerated)
- ✅ Worker queue processes queries in parallel (20 workers)
- ✅ `image_pool.json` grows steadily
- ✅ Script can be stopped and restarted safely
- ✅ No paid APIs used (DuckDuckGo only)
- ✅ Failed queries don't stop workers
- ✅ Progress flushed immediately
- ✅ Retry logic with exponential backoff

## Configuration

All settings in `CONFIG` object:

```javascript
{
  maxConcurrentWorkers: 20,    // Worker queue size
  requestDelay: 1500,          // Rate limit (ms)
  maxRetries: 3,               // Retry attempts
  retryDelay: 5000,            // Retry delay (ms)
  logIntervalQueries: 100,    // Log every N queries
}
```

## Usage

The scraper automatically:
1. Generates `canonical_queries.json` on first run (if missing)
2. Uses existing queries on subsequent runs
3. Processes queries via worker queue
4. Tracks progress in `canonical_progress.json`
5. Resumes from last position on restart

## Files Generated

- `canonical_queries.json`: Query list (2,000–4,000 queries)
- `canonical_progress.json`: Progress tracking
- `progress_harvest.json`: Detailed harvest progress
- `image_pool.json`: Global image cache (grows during harvesting)
- `failed_queries.json`: Failed queries (if any)

## Notes

- Queries are normalized and deduplicated aggressively
- Generic parent terms are filtered out
- Worker queue ensures efficient parallel processing
- Progress is saved immediately (no data loss on crash)
- Failed queries are logged but don't block progress
