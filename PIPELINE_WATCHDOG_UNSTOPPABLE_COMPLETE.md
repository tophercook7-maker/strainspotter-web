# Pipeline Control — Phase 3: Watchdog + Auto-Recovery (Unstoppable) — COMPLETE

## Overview

Enhanced watchdog system with confirmation-based stall detection, cooldown periods, and improved safety features for unstoppable pipeline operation.

## Key Rules ✅

- ✅ **Do NOT modify core stage logic**
- ✅ **Restart ONLY the active stalled stage**
- ✅ **Never delete outputs or progress files**
- ✅ **Always log actions to events file**

## Implementation

### Part 1: Watchdog Script ✅

**File**: `tools/pipeline_watchdog.mjs`

**Behavior**:
1. ✅ Polls `GET http://localhost:<PORT>/api/pipeline/status` every 2 minutes (configurable)
   - PORT determined via `PIPELINE_PORT` env (default: 3000)
2. ✅ If `health === "stalled"` OR `stalled === true`:
   - Reads `active_stage`
   - Triggers restart for THAT stage only
3. ✅ If `health === "error"`:
   - Logs event; does NOT restart automatically

**Configuration (env vars with defaults)**:
- `PIPELINE_PORT=3000`
- `WATCHDOG_INTERVAL_MS=120000` (2 minutes)
- `STALL_CONFIRMATIONS=2` (must see stalled twice in a row)
- `COOLDOWN_MS=600000` (10 minutes after restart)

**Features**:
- ✅ Keeps last N status snapshots in memory
- ✅ Only restarts when stalled confirmed N times consecutively
- ✅ Respects cooldown per stage

### Part 2: Stage Restart Handlers ✅

**Implemented `restartStage(active_stage)`**:

**Preferred Mechanism**:
- ✅ Uses PM2 process restart if stage is already managed by PM2
- ✅ Otherwise spawns stage runner as detached child process

**Script Discovery**:
- ✅ Searches for existing runner scripts in `tools/`:
  - `run_image_scraper.mjs` (harvesting/assignment)
  - `image_fingerprinting.mjs` (fingerprinting)
  - `canonical_queries.mjs` or `build_canonical.mjs` (canonical - if exists)
- ✅ No hardcoded script names

**Stage Mapping**:
- `canonical` → canonical query generation script OR no-op if one-time and complete
- `harvesting` → harvester runner script (`run_image_scraper.mjs`)
- `fingerprinting` → `image_fingerprinting.mjs`
- `assignment` → assignment pass runner script (`run_image_scraper.mjs` - same as harvesting)

**PM2 Naming**:
- Standardized names:
  - `pipeline-canonical`
  - `pipeline-harvesting`
  - `pipeline-fingerprinting`
  - `pipeline-assignment`
  - `pipeline-watchdog`

**Start Stage Helper**:
- ✅ Checks `pm2 list` before starting
- ✅ Prevents duplicate processes
- ✅ Uses `pm2 start <script> --name <name>` if not running

### Part 3: Event Logging (Audit Trail) ✅

**File**: `pipeline_events.jsonl` (JSONL format - one JSON object per line)

**Event Types**:
- `watchdog_started`: Watchdog process started
- `watchdog_stopped`: Watchdog process stopped
- `stall_detected`: Stage detected as stalled
- `restart_triggered`: Restart command issued
- `restart_blocked`: Restart blocked due to cooldown
- `recovery_success`: Restart succeeded
- `recovery_failed`: Restart failed
- `error_detected`: Pipeline health is error (logged, not auto-restarted)
- `watchdog_error`: Watchdog internal error

**Event Format**:
```json
{
  "timestamp": "2025-01-20T12:00:00.000Z",
  "event": "stall_detected",
  "stage": "harvesting",
  "details": {
    "active_stage": "Image Harvesting",
    "status": "stalled",
    "progress": 45,
    "completed": 1000,
    "total": 4000,
    "rate_per_minute": 50,
    "last_update": "2025-01-20T11:50:00.000Z",
    "confirmation_count": 1
  }
}
```

**Logged Information**:
- ✅ Status snapshot summary (active_stage, last_updated, percent, rate_per_min)
- ✅ Restart mechanism used (pm2_restart | pm2_start | spawn)
- ✅ Confirmation count
- ✅ Cooldown information

### Part 4: Safety + Hardening ✅

**Network Error Handling**:
- ✅ Catches fetch errors, logs `error_detected`, continues
- ✅ 10-second timeout on status API requests
- ✅ If `/api/pipeline/status` is unavailable, does NOT restart anything

**Single Instance**:
- ✅ Runs under PM2 (handles single instance)
- ✅ PM2 ensures only one watchdog process

**Additional Safety**:
- ✅ Confirmation system prevents false positives
- ✅ Cooldown prevents rapid restart loops
- ✅ Script discovery prevents hardcoded dependencies
- ✅ Graceful shutdown on SIGTERM/SIGINT

### Part 5: PM2 Setup Commands ✅

**Documentation**: Updated `tools/README_PIPELINE_WATCHDOG.md`

**Commands**:
```bash
# Start watchdog
pm2 start tools/pipeline_watchdog.mjs --name pipeline-watchdog

# View logs
pm2 logs pipeline-watchdog

# List processes
pm2 ls
# or
pm2 list

# Stop watchdog
pm2 stop pipeline-watchdog

# Restart watchdog
pm2 restart pipeline-watchdog

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

## Success Criteria ✅

- ✅ If pipeline stalls, watchdog restarts only the stalled stage after confirmation
- ✅ No rapid restart loops (cooldown enforced)
- ✅ All restarts are logged to `pipeline_events.jsonl`
- ✅ Watchdog survives restarts/crashes under PM2
- ✅ Zero changes to user-facing app features

## Key Features

### Confirmation System
- Must see stall **N times consecutively** (default: 2) before restarting
- Prevents false positives from temporary network issues
- Healthy status clears confirmation count

### Cooldown Period
- After restarting a stage, enters cooldown (default: 10 minutes)
- No additional restarts during cooldown
- Prevents rapid restart loops

### Script Discovery
- Automatically discovers stage runner scripts in `tools/` directory
- No hardcoded script paths
- Falls back gracefully if script not found

### PM2 Integration
- Prefers PM2 restart if process exists
- Falls back to spawn if PM2 not available
- Standardized process names

### Event Logging
- JSONL format (one JSON object per line)
- Easy to parse and analyze
- Includes full status snapshots
- Tracks confirmation counts and cooldowns

## Files Modified/Created

1. **`tools/pipeline_watchdog.mjs`**: Enhanced watchdog with confirmation and cooldown
2. **`tools/README_PIPELINE_WATCHDOG.md`**: Updated documentation
3. **`pipeline_events.jsonl`**: Event log (created at runtime)

## Configuration Examples

```bash
# Default configuration
pm2 start tools/pipeline_watchdog.mjs --name pipeline-watchdog

# Custom port and interval
PIPELINE_PORT=8080 WATCHDOG_INTERVAL_MS=180000 pm2 start tools/pipeline_watchdog.mjs --name pipeline-watchdog

# Stricter confirmation (3 times)
STALL_CONFIRMATIONS=3 COOLDOWN_MS=900000 pm2 start tools/pipeline_watchdog.mjs --name pipeline-watchdog
```

## Monitoring

### View Events
```bash
# All events
cat pipeline_events.jsonl | jq '.'

# Recent events
tail -f pipeline_events.jsonl | jq '.'

# Filter by event type
cat pipeline_events.jsonl | jq 'select(.event == "stall_detected")'
```

### Check Status
```bash
# PM2 status
pm2 status

# Watchdog logs
pm2 logs pipeline-watchdog

# Pipeline dashboard
# Visit http://localhost:3000/internal/pipeline
```

## Notes

- Watchdog runs independently of pipeline stages
- Can be stopped/started without affecting pipeline
- Event log is append-only (JSONL format)
- PM2 ensures watchdog survives crashes
- Watchdog does NOT modify pipeline logic
- Error states are logged but NOT auto-restarted
- Confirmation system prevents false positives
- Cooldown prevents rapid restart loops
