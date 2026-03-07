# Image Scraper Documentation

## Overview

The image scraper system consists of two versions:

- **v1** (`image_scraper.mjs`): Original single-strain scraper
- **v2** (`image_scraper_v2.mjs`): Mass-scale scraper for ~35,000 strains
- **Runner** (`run_image_scraper.mjs`): PM2-ready wrapper for unattended execution

## Architecture (V2)

The v2 scraper uses a three-layer architecture:

### Layer 1: Canonical Query Pool
- Generates search queries from strain names, aliases, and lineage
- Output: `canonical_queries.json`
- Progress: Saved automatically

### Layer 2: Image Harvester
- Concurrent scraping from DuckDuckGo Images
- Output: `image_pool.json` (deduplicated global cache)
- Progress: `progress_harvest.json`
- Workers: 20 concurrent (configurable)
- Rate limit: 1.5s delay between requests

### Layer 3: Strain Assignment
- Assigns images from pool to individual strains
- Matching priority: exact name → alias → parent → generic
- Output: `strain_images.json`
- Progress: `progress_assign.json`
- Images reused freely (no uniqueness requirement)

## Usage

### Manual Run

```bash
# Run v2 scraper directly
node tools/image_scraper_v2.mjs
```

### PM2 (Recommended for Unattended)

```bash
# Start with PM2
pm2 start tools/run_image_scraper.mjs --name strain-image-scraper

# View logs
pm2 logs strain-image-scraper

# Restart (will resume from progress)
pm2 restart strain-image-scraper

# Stop
pm2 stop strain-image-scraper

# Delete
pm2 delete strain-image-scraper
```

## State Management

The runner uses `scraper_state.json` to track completion:

```json
{
  "harvesting_complete": false,
  "assignment_complete": false,
  "last_updated": "2025-01-20T12:00:00.000Z"
}
```

The scraper automatically:
- Resumes from progress files
- Skips completed layers
- Updates state on completion

## Output Files

- `canonical_queries.json`: Search queries
- `image_pool.json`: Global image cache
- `strain_images.json`: Final assignments (used by frontend)
- `progress_harvest.json`: Harvest progress
- `progress_assign.json`: Assignment progress
- `scraper_state.json`: Runner state

## Configuration

Edit `CONFIG` in `image_scraper_v2.mjs`:

```javascript
const CONFIG = {
  maxConcurrentWorkers: 20,
  requestDelay: 1500,
  maxRetries: 3,
  maxImagesPerQuery: 8,
  minImagesPerStrain: 1,
  maxImagesPerStrain: 5,
  logIntervalQueries: 100,
  logIntervalStrains: 1000,
};
```

## Resilience

- **Crash Safety**: All major loops wrapped in try/catch
- **Progress Persistence**: Saved every 100 items
- **Resume Support**: Automatically resumes from last position
- **Error Logging**: Errors logged, not fatal
- **PM2 Compatible**: Clean exit codes, signal handling

## Frontend Integration

Images are loaded via `lib/strainImages.ts`:

```typescript
import { getStrainPrimaryImage } from '@/lib/strainImages';

const imageUrl = await getStrainPrimaryImage(slug);
```

The utility:
- Loads `strain_images.json` from multiple possible paths
- Caches results for performance
- Returns first available image for a strain
- Handles missing files gracefully

## Troubleshooting

### No images appearing
1. Check `strain_images.json` exists and has data
2. Verify file path in browser network tab
3. Check browser console for load errors

### Scraper not resuming
1. Check `progress_harvest.json` and `progress_assign.json`
2. Verify `scraper_state.json` exists
3. Check PM2 logs for errors

### Out of memory
- Reduce `maxConcurrentWorkers` in CONFIG
- Process in smaller batches

### Rate limiting
- Increase `requestDelay` in CONFIG
- Reduce `maxConcurrentWorkers`
