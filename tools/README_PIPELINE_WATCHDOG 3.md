# Pipeline Watchdog - Auto-Recovery System (Unstoppable)

## Overview

The Pipeline Watchdog monitors pipeline status and automatically restarts stalled stages without human intervention. Features confirmation-based stall detection, cooldown periods, and full audit trail.

## Features

- ✅ **Automatic Stall Detection**: Monitors pipeline status every 3 minutes
- ✅ **Targeted Recovery**: Only restarts the stalled stage, not everything
- ✅ **Event Logging**: All actions logged to `pipeline_events.json`
- ✅ **PM2 Integration**: Runs under PM2 for crash safety
- ✅ **Auditable**: All recovery actions are logged and reviewable

## Installation

### 1. Install PM2 (if not already installed)

```bash
npm install -g pm2
```

### 2. Start Watchdog with PM2

```bash
# Start watchdog
pm2 start tools/pipeline_watchdog.mjs --name pipeline-watchdog

# Or start all pipeline processes
pm2 start pm2/ecosystem.config.cjs
```

### 3. Monitor Status

```bash
# View all processes
pm2 list
# or
pm2 ls

# View watchdog logs
pm2 logs pipeline-watchdog

# View status
pm2 status pipeline-watchdog
```

## Configuration

Configure via environment variables (with defaults):

- **PIPELINE_PORT**: Port for status API (default: `3000`)
- **WATCHDOG_INTERVAL_MS**: Polling interval in milliseconds (default: `120000` = 2 minutes)
- **STALL_CONFIRMATIONS**: Number of consecutive stalls before restart (default: `2`)
- **COOLDOWN_MS**: Cooldown period after restart in milliseconds (default: `600000` = 10 minutes)

Example:
```bash
PIPELINE_PORT=3000 WATCHDOG_INTERVAL_MS=120000 STALL_CONFIRMATIONS=2 COOLDOWN_MS=600000 pm2 start tools/pipeline_watchdog.mjs --name pipeline-watchdog
```

## How It Works

### 1. Polling

The watchdog polls `/api/pipeline/status` every 2 minutes (configurable) to check pipeline health.

### 2. Stall Detection

A stage is considered **stalled** if:
- Status is `stalled`, OR
- Status is `running` but last update was > 10 minutes ago

### 3. Confirmation System

To prevent false positives:
- Must see stall **N times consecutively** (default: 2) before restarting
- Each stall detection increments confirmation count
- Healthy status clears confirmation count

### 4. Cooldown Period

After restarting a stage:
- Stage enters cooldown period (default: 10 minutes)
- No additional restarts during cooldown
- Prevents rapid restart loops

### 5. Recovery Strategy

When stall is confirmed:

1. **Identify Active Stage**: Uses `active_stage` from status API
2. **Check Cooldown**: Skips if stage is in cooldown
3. **Discover Script**: Finds stage runner script in `tools/` directory
4. **PM2 First**: Tries PM2 restart if process exists
5. **Fallback**: Spawns script directly if PM2 not available
6. **Event Logging**: Logs all actions to `pipeline_events.jsonl`

### 4. Error Handling

- **Error State**: If `health === "error"`, logs but does NOT auto-restart
- **Recovery Failure**: Logs failure but continues monitoring

## Stage Restart Handlers

### Image Harvesting

- **PM2**: Restarts `strain-image-scraper` process
- **Direct**: Spawns `tools/run_image_scraper.mjs`

### Fingerprinting

- **PM2**: Restarts `image-fingerprinting` process
- **Direct**: Spawns `tools/image_fingerprinting.mjs`

### Strain Assignment

- **PM2**: Restarts `strain-image-scraper` process (same as harvesting)
- **Direct**: Spawns `tools/run_image_scraper.mjs`

Note: Assignment is part of the scraper, so restarting the scraper will resume from assignment progress.

## Event Logging

All events are logged to `pipeline_events.jsonl` (JSONL format - one JSON object per line):

```json
{"timestamp":"2025-01-20T12:00:00.000Z","event":"stall_detected","stage":"harvesting","details":{"active_stage":"Image Harvesting","status":"stalled","progress":45,"last_update":"2025-01-20T11:50:00.000Z","confirmation_count":1}}
{"timestamp":"2025-01-20T12:02:00.000Z","event":"stall_detected","stage":"harvesting","details":{"active_stage":"Image Harvesting","status":"stalled","progress":45,"last_update":"2025-01-20T11:50:00.000Z","confirmation_count":2}}
{"timestamp":"2025-01-20T12:02:01.000Z","event":"restart_triggered","stage":"harvesting","details":{"method":"pm2_restart","pm2_name":"pipeline-harvesting"}}
{"timestamp":"2025-01-20T12:02:05.000Z","event":"recovery_success","stage":"harvesting","details":{"confirmation_count":2,"timestamp":"2025-01-20T12:02:05.000Z"}}
```

### Event Types

- `watchdog_started`: Watchdog process started
- `watchdog_stopped`: Watchdog process stopped
- `stall_detected`: Stage detected as stalled (includes confirmation count)
- `restart_triggered`: Restart command issued (includes method: pm2_restart/pm2_start/spawn)
- `restart_blocked`: Restart blocked due to cooldown
- `recovery_success`: Restart succeeded
- `recovery_failed`: Restart failed
- `error_detected`: Pipeline health is error (logged, not auto-restarted)
- `watchdog_error`: Watchdog internal error

## PM2 Commands

```bash
# Start all processes
pm2 start pm2/ecosystem.config.cjs

# Stop watchdog
pm2 stop pipeline-watchdog

# Restart watchdog
pm2 restart pipeline-watchdog

# View logs
pm2 logs pipeline-watchdog

# View status
pm2 status

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

## Monitoring

### View Event Log

```bash
# View all events (JSONL format)
cat pipeline_events.jsonl

# Pretty print with jq
cat pipeline_events.jsonl | jq '.'

# View recent events
tail -f pipeline_events.jsonl | jq '.'
```

### Check Pipeline Status

Visit `/internal/pipeline` dashboard to see:
- Current pipeline health
- Active stages
- Recovery events (via status changes)

## Troubleshooting

### Watchdog Not Detecting Stalls

1. Check that `/api/pipeline/status` is accessible
2. Verify stall threshold (default 10 minutes)
3. Check event log for `stall_detected` events

### Restarts Not Working

1. Check PM2 process list: `pm2 list`
2. Verify script paths exist
3. Check event log for `recovery_failed` events
4. Check PM2 logs: `pm2 logs pipeline-watchdog`

### Watchdog Crashes

1. Check PM2 logs: `pm2 logs pipeline-watchdog`
2. Verify status API URL is correct
3. Check event log for `watchdog_error` events

## Safety Features

- ✅ **No Blind Restarts**: Only restarts stalled stages
- ✅ **Respects Progress**: Scripts resume from progress files
- ✅ **No Data Deletion**: Never deletes progress or data files
- ✅ **Error Logging**: Errors logged but don't stop monitoring
- ✅ **PM2 Safety**: Uses PM2 restart limits to prevent rapid restarts

## Success Criteria

- ✅ Stalled pipeline auto-recovers
- ✅ Dashboard shows recovery via status changes
- ✅ No manual babysitting required
- ✅ All actions are logged and reviewable

## Notes

- Watchdog runs independently of pipeline stages
- Can be stopped/started without affecting pipeline
- Event log keeps last 1000 events (auto-trimmed)
- PM2 ensures watchdog survives crashes
- Watchdog does NOT modify pipeline logic
