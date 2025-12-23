# Pipeline Control — Phase 2: Internal Dashboard UI — COMPLETE

## Overview

Created a read-only internal dashboard that visualizes pipeline status using the existing `/api/pipeline/status` endpoint.

## Key Rules ✅

- ✅ **NO pipeline logic changes**
- ✅ **NO intelligence changes**
- ✅ **NO controls** (no start/stop/restart buttons)
- ✅ **Internal use only**

## Route

- **Path**: `/internal/pipeline`
- **Type**: Client component (polls API)

## Data Source

- **Endpoint**: `GET /api/pipeline/status`
- **Polling**: Every 7 seconds (between 5-10 as requested)
- **Cache**: No cache (`cache: 'no-store'`)

## API Endpoint

**File**: `app/api/pipeline/status/route.ts`

**Returns**:
```json
{
  "active_stage": "Image Harvesting",
  "health": "ok" | "stalled" | "error",
  "last_updated": "2025-01-20T12:00:00.000Z",
  "stages": [
    {
      "name": "Canonical Query Generation",
      "status": "complete",
      "progress": 100,
      "completed": 1,
      "total": 1,
      "rate_per_minute": 0,
      "last_update": "2025-01-20T12:00:00.000Z",
      "stalled": false
    }
  ]
}
```

**Stages Detected**:
1. **Canonical Query Generation**: Checks for `canonical_queries.json`
2. **Image Harvesting**: Uses `canonical_progress.json` and `scraper_state.json`
3. **Strain Assignment**: Uses `assignment_progress.json` and `scraper_state.json`
4. **Fingerprinting**: Optional, uses `fingerprint_progress.json` if exists

## UI Requirements ✅

### Global Header
- ✅ **Active stage**: Shows current running stage or "None"
- ✅ **Overall health indicator**:
  - Green (ok) = all stages healthy
  - Yellow (stalled) = any stage stalled
  - Red (error) = any stage in error
- ✅ **Last updated**: Shows seconds since last fetch

### Stage Table / Cards
For each stage:
- ✅ **Stage name**: Clear heading
- ✅ **Status badge**: Color-coded (idle/running/complete/stalled/error)
- ✅ **Progress bar**: Visual 0-100% with color coding
- ✅ **Completed / Total**: Numbers with formatting
- ✅ **Rate per minute**: Calculated from progress and time
- ✅ **Last update timestamp**: Formatted as "X seconds/minutes/hours ago"

### Behavior
- ✅ **Stalled highlighting**: Yellow border and background tint
- ✅ **Error highlighting**: Red border and background tint
- ✅ **Warning banner**: Shows when `health === 'error'`
- ✅ **Defensive rendering**: Handles missing fields gracefully
- ✅ **No assumptions**: Works even if stages are missing

## Technical Notes ✅

- **Defensive rendering**: All fields checked before display
- **No crashes**: Missing fields default to safe values
- **No assumptions**: Stage order doesn't matter
- **Simple styling**: Ops-focused, clean design
- **Auto-refresh**: Polls every 7 seconds
- **Error handling**: Shows error banner if API fails

## Success Criteria ✅

- ✅ At a glance, you can tell:
  - What is running (active stage highlighted)
  - What is slow (stalled stages highlighted)
  - What is stuck (stalled badge + visual highlighting)
- ✅ No guessing (all data visible)
- ✅ No log digging (dashboard shows everything)

## Files Created

1. **`app/api/pipeline/status/route.ts`**: Pipeline status API endpoint
2. **`app/internal/pipeline/page.tsx`**: Internal dashboard UI

## Usage

Navigate to `/internal/pipeline` to view the dashboard.

The dashboard will:
1. Load initial status
2. Poll every 7 seconds
3. Update in real-time
4. Show all stages with progress
5. Highlight stalled/error states
6. Display rates and timestamps

## Stalled Detection

A stage is considered **stalled** if:
- Last update was more than 5 minutes ago
- Status is not "complete" or "idle"

## Health Calculation

- **ok**: All stages healthy (not stalled, not error)
- **stalled**: At least one stage is stalled
- **error**: At least one stage has status "error"

## Notes

- Dashboard is read-only (no controls)
- Access control can be added at route level if needed
- All data comes from progress files (no database queries)
- Rate calculation uses time since last update
- Progress bars are color-coded by status
- Responsive design works on desktop and mobile
