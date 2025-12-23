# Pipeline Stage → Script Mapping Verification

## Actual Stage Runners (Enumerated)

### canonical
- **Script**: `tools/image_scraper_v2.mjs` (Layer 1)
- **Purpose**: Builds canonical query pool from strain names/aliases/parents
- **Resume-Safe**: ✅ Yes - checks if `canonical_queries.json` exists, skips if present
- **Note**: One-time operation. If file exists, stage is effectively complete. Restarting `image_scraper_v2.mjs` will skip this layer if queries already exist.

### harvesting
- **Script**: `tools/run_image_scraper.mjs` (wrapper) → `tools/image_scraper_v2.mjs` (Layer 2)
- **Purpose**: Harvests images from DuckDuckGo for canonical queries
- **Resume-Safe**: ✅ Yes - uses `canonical_progress.json` and `progress_harvest.json` to resume
- **Note**: Wrapper script manages state, then spawns `image_scraper_v2.mjs` which handles harvesting. The scraper checks `scraper_state.json` and only runs harvesting if `harvesting_complete === false`.

### fingerprinting
- **Script**: `tools/image_fingerprinting.mjs`
- **Purpose**: Computes perceptual hashes, clusters images, maps strains to clusters
- **Resume-Safe**: ✅ Yes - uses `fingerprint_progress.json` to resume
- **Note**: Independent script, not part of scraper orchestrator.

### assignment
- **Script**: `tools/run_image_scraper.mjs` (wrapper) → `tools/image_scraper_v2.mjs` (Layer 3)
- **Purpose**: Assigns images from pool to strains
- **Resume-Safe**: ✅ Yes - uses `assignment_progress.json` to resume
- **Note**: Same orchestrator as harvesting (`image_scraper_v2.mjs`), but different layer. The scraper checks state and only runs assignment if `harvesting_complete === true` OR if image pool exists. Assignment is Layer 3, so it only advances if Layer 2 is complete.

## Shared Orchestrator Behavior

`tools/image_scraper_v2.mjs` handles three layers:
1. **Layer 1 (canonical)**: One-time, skips if `canonical_queries.json` exists
2. **Layer 2 (harvesting)**: Only runs if `harvesting_complete === false`
3. **Layer 3 (assignment)**: Only runs if `harvesting_complete === true` OR image pool exists

**Resume Safety**: ✅ Confirmed
- Each layer checks completion state before running
- Progress files prevent reprocessing
- State file (`scraper_state.json`) tracks completion flags

**Stage Advancement**: ✅ Confirmed
- Restarting `run_image_scraper.mjs` will:
  - Skip Layer 1 if queries exist
  - Skip Layer 2 if `harvesting_complete === true`
  - Only run Layer 3 if Layer 2 is complete
- Therefore, restarting the orchestrator is safe and only advances incomplete stages.

## Mapping Decision

Since `harvesting` and `assignment` share the same orchestrator (`run_image_scraper.mjs` → `image_scraper_v2.mjs`), but are different stages:

- **harvesting**: Restart `run_image_scraper.mjs` (will run Layer 2 if not complete)
- **assignment**: Restart `run_image_scraper.mjs` (will run Layer 3 if Layer 2 is complete)

Both use the same script, but the orchestrator's internal logic ensures only the correct layer runs.

## Canonical Stage Restart Behavior

Since canonical is one-time and skips if file exists:
- Restarting `run_image_scraper.mjs` will skip Layer 1 if `canonical_queries.json` exists
- Effectively a no-op if already complete
- Safe to restart, but won't do anything if complete
