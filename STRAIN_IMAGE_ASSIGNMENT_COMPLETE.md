# Strain Image Assignment Pass — COMPLETE

## Overview

Enhanced Layer 3 (assignment) to efficiently assign images from the global `image_pool.json` to all ~35,000 strains using a local-only, fast matching algorithm.

## Key Features ✅

### 1. **No Network Requests**
- Pure local operation
- No scraping
- No paid APIs
- All data from existing files

### 2. **Priority-Based Matching**

Assignment follows strict priority order:

1. **Exact Match**: Normalized strain name matches canonical query
   - `assigned_from: "exact"`
   - Highest priority

2. **Alias Match**: Normalized alias matches canonical query
   - `assigned_from: "alias"`
   - Second priority

3. **Parent Match**: Parent strain from lineage matches canonical query
   - `assigned_from: "parent"`
   - Third priority

4. **Fallback**: Generic "cannabis bud" query
   - `assigned_from: "fallback"`
   - Last resort

### 3. **Performance Optimizations**

- **Batch Writes**: Saves progress every 500 strains (instead of 100)
- **Fast Lookups**: Uses `Set` for assigned slugs (O(1) lookup)
- **Normalized Queries**: Pre-normalizes all queries for fast matching
- **No Async**: Synchronous operation for maximum speed

### 4. **Resume-Safe**

- Tracks progress in `assignment_progress.json`
- Skips already-assigned strains on restart
- Maintains backward compatibility with `progress_assign.json`

### 5. **Comprehensive Tracking**

- Tracks match types (exact, alias, parent, fallback)
- Reports processing speed (strains/sec)
- Shows coverage percentage
- Detailed completion statistics

## Output Format

```json
[
  {
    "strain_slug": "blue-dream",
    "strain_name": "Blue Dream",
    "image_url": "https://example.com/image.jpg",
    "source": "duckduckgo",
    "assigned_from": "exact",
    "assigned_at": "2025-01-20T12:00:00.000Z"
  }
]
```

## Assignment Logic

For each strain:

1. **Check if already assigned** (resume-safe)
   - Uses `Set` for O(1) lookup
   - Skips if already has ≥1 image

2. **Try exact match**
   - Normalize strain name
   - Look up in `queryToImages` map
   - Assign up to `maxImagesPerStrain` (default: 5)

3. **Try alias match** (if exact didn't satisfy minimum)
   - Iterate through aliases
   - Normalize each alias
   - Match against queries
   - Stop when minimum satisfied

4. **Try parent match** (if still not satisfied)
   - Use canonical queries with `source: "parent"`
   - Match against queries
   - Stop when minimum satisfied

5. **Fallback** (if still not satisfied)
   - Use generic "cannabis bud" query
   - Assign at least 1 image if available

## Performance

- **Speed**: Processes thousands of strains per second
- **Memory**: Efficient Map/Set data structures
- **I/O**: Batch writes every 500 strains
- **No Blocking**: Synchronous operation

## Progress Tracking

- **File**: `assignment_progress.json`
- **Format**:
  ```json
  {
    "last_processed_index": 15000,
    "updated_at": "2025-01-20T12:00:00.000Z"
  }
  ```

- **Resume**: Automatically resumes from last processed index
- **Backward Compatible**: Also checks `progress_assign.json`

## Statistics Reported

On completion, reports:
- Total images assigned
- Strains skipped (already assigned)
- Processing time and rate (strains/sec)
- Match breakdown:
  - Exact matches
  - Alias matches
  - Parent matches
  - Fallback matches
- Coverage percentage

## Success Criteria ✅

- ✅ `strain_images.json` populated
- ✅ Majority of strains have ≥1 image
- ✅ Script completes without scraping
- ✅ Fast processing (thousands per second)
- ✅ Resume-safe
- ✅ Proper priority matching
- ✅ Comprehensive statistics

## Usage

The assignment pass runs automatically as part of the full scraper workflow:

```bash
# Run full scraper (includes assignment)
node tools/image_scraper_v2.mjs

# Or via PM2 runner
pm2 start tools/run_image_scraper.mjs --name strain-image-scraper
```

The assignment pass will:
1. Load existing `image_pool.json`
2. Load `canonical_queries.json`
3. Load strain list
4. Assign images using priority matching
5. Save to `strain_images.json`
6. Track progress for resume capability

## Notes

- Images are reused freely (no uniqueness requirement)
- Assignment is deterministic (same inputs = same outputs)
- Normalized queries ensure consistent matching
- Fallback ensures maximum coverage
- All operations are local and fast
