#!/usr/bin/env node

/**
 * Pipeline Watchdog - Auto-Recovery System (Unstoppable)
 * 
 * Monitors pipeline status and automatically restarts stalled stages.
 * 
 * RULES:
 * - Do NOT modify core stage logic
 * - Restart ONLY the active stalled stage
 * - Never delete outputs or progress files
 * - Always log actions to events file
 */

import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * AUTHORITATIVE STAGE → SCRIPT MAPPING
 * 
 * This is the single source of truth for which script handles each pipeline stage.
 * Discovery logic remains as fallback only.
 * 
 * Verified: 2025-01-20
 * - canonical: Handled by image_scraper_v2.mjs Layer 1 (one-time, skips if queries exist)
 * - harvesting: Handled by run_image_scraper.mjs → image_scraper_v2.mjs Layer 2
 * - fingerprinting: Handled by image_fingerprinting.mjs (independent script)
 * - assignment: Handled by run_image_scraper.mjs → image_scraper_v2.mjs Layer 3
 * 
 * Resume Safety: All scripts are resume-safe via progress files and state checks.
 */
const STAGE_RUNNERS = {
  canonical: {
    script: 'tools/run_image_scraper.mjs',
    pm2Name: 'pipeline-canonical',
    note: 'Layer 1 of orchestrator. One-time operation, skips if canonical_queries.json exists.',
  },
  harvesting: {
    script: 'tools/run_image_scraper.mjs',
    pm2Name: 'pipeline-harvesting',
    note: 'Layer 2 of orchestrator. Orchestrator checks state and only runs if harvesting_complete === false.',
  },
  fingerprinting: {
    script: 'tools/image_fingerprinting.mjs',
    pm2Name: 'pipeline-fingerprinting',
    note: 'Independent script. Resume-safe via fingerprint_progress.json.',
  },
  assignment: {
    script: 'tools/run_image_scraper.mjs',
    pm2Name: 'pipeline-assignment',
    note: 'Layer 3 of orchestrator. Orchestrator checks state and only runs if harvesting_complete === true.',
  },
};

// Configuration (env vars with defaults)
const CONFIG = {
  // Port for status API
  port: process.env.PIPELINE_PORT || '3000',
  
  // Polling interval
  pollIntervalMs: parseInt(process.env.WATCHDOG_INTERVAL_MS || '120000', 10), // 2 minutes default
  
  // Stall confirmation (must see stalled N times consecutively)
  stallConfirmations: parseInt(process.env.STALL_CONFIRMATIONS || '2', 10),
  
  // Cooldown after restart (10 minutes default)
  cooldownMs: parseInt(process.env.COOLDOWN_MS || '600000', 10),
  
  // Event log file (JSONL format)
  eventsFile: 'pipeline_events.jsonl',
  
  // Status snapshots to keep in memory
  maxSnapshots: 10,
};

// In-memory state
const state = {
  statusSnapshots: [], // Last N status responses
  stageCooldowns: new Map(), // stage -> timestamp of last restart
  stallConfirmations: new Map(), // stage -> count of consecutive stalls
};

/**
 * Get status API URL
 */
function getStatusApiUrl() {
  return `http://localhost:${CONFIG.port}/api/pipeline/status`;
}

/**
 * Log event to JSONL file
 */
function logEvent(event, stage, details = {}) {
  const eventObj = {
    timestamp: new Date().toISOString(),
    event,
    stage: stage || null,
    details,
  };
  
  const line = JSON.stringify(eventObj) + '\n';
  const path = join(process.cwd(), CONFIG.eventsFile);
  
  try {
    appendFileSync(path, line);
    console.log(`[WATCHDOG] Event: ${event} | Stage: ${stage || 'N/A'} | ${JSON.stringify(details)}`);
  } catch (error) {
    console.error('[WATCHDOG] Failed to write event:', error.message);
  }
}

/**
 * Fetch pipeline status
 */
async function fetchPipelineStatus() {
  try {
    const url = getStatusApiUrl();
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[WATCHDOG] Failed to fetch pipeline status:', error.message);
    logEvent('error_detected', null, {
      error: 'status_api_unavailable',
      message: error.message,
    });
    return null;
  }
}

/**
 * Check if stage is in cooldown
 */
function isInCooldown(stage) {
  const lastRestart = state.stageCooldowns.get(stage);
  if (!lastRestart) return false;
  
  const timeSinceRestart = Date.now() - lastRestart;
  return timeSinceRestart < CONFIG.cooldownMs;
}

/**
 * Record stall confirmation
 */
function recordStallConfirmation(stage) {
  const current = state.stallConfirmations.get(stage) || 0;
  state.stallConfirmations.set(stage, current + 1);
  return current + 1;
}

/**
 * Clear stall confirmation (stage is healthy)
 */
function clearStallConfirmation(stage) {
  state.stallConfirmations.delete(stage);
}

/**
 * Check if stall is confirmed (seen N times consecutively)
 */
function isStallConfirmed(stage) {
  const count = state.stallConfirmations.get(stage) || 0;
  return count >= CONFIG.stallConfirmations;
}

/**
 * Get stage runner script (authoritative mapping)
 * Falls back to discovery only if mapping is missing
 */
function getStageScript(stage) {
  // Use authoritative mapping first
  const mapping = STAGE_RUNNERS[stage];
  if (mapping) {
    const scriptPath = join(process.cwd(), mapping.script);
    if (existsSync(scriptPath)) {
      return scriptPath;
    }
    // Script missing - log but don't guess
    console.warn(`[WATCHDOG] Mapped script not found: ${mapping.script}`);
    return null;
  }
  
  // Fallback: discovery (should not be needed if mapping is complete)
  console.warn(`[WATCHDOG] No mapping for stage: ${stage}, attempting discovery...`);
  return discoverStageScript(stage);
}

/**
 * Fallback discovery for a single stage (used only if mapping missing)
 */
function discoverStageScript(stage) {
  const toolsDir = join(process.cwd(), 'tools');
  const candidates = {
    canonical: ['run_image_scraper.mjs'],
    harvesting: ['run_image_scraper.mjs'],
    fingerprinting: ['image_fingerprinting.mjs'],
    assignment: ['run_image_scraper.mjs'],
  };
  
  const stageCandidates = candidates[stage] || [];
  for (const candidate of stageCandidates) {
    const path = join(toolsDir, candidate);
    if (existsSync(path)) {
      return path;
    }
  }
  
  return null;
}

/**
 * Check if PM2 process exists
 */
async function pm2ProcessExists(name) {
  try {
    const { stdout } = await execAsync('pm2 list');
    return stdout.includes(name);
  } catch (error) {
    return false;
  }
}

/**
 * Get PM2 process name for stage (from authoritative mapping)
 */
function getPm2ProcessName(stage) {
  const mapping = STAGE_RUNNERS[stage];
  return mapping ? mapping.pm2Name : null;
}

/**
 * Restart stage via PM2
 * 
 * Logic (deterministic and idempotent):
 * 1) Check if PM2 process exists for stage
 * 2) If exists → pm2 restart <name>
 * 3) If not exists → pm2 start <script> --name <name>
 * 4) Never start duplicates (PM2 prevents this, but we check first)
 * 5) Never restart during cooldown (checked before this function)
 */
async function restartStagePm2(stage, scriptPath) {
  const pm2Name = getPm2ProcessName(stage);
  if (!pm2Name) {
    throw new Error(`No PM2 name mapping for stage: ${stage}`);
  }
  
  // Step 1: Check if PM2 process exists
  const exists = await pm2ProcessExists(pm2Name);
  
  if (exists) {
    // Step 2: Restart existing process
    await execAsync(`pm2 restart ${pm2Name}`);
    return { method: 'pm2_restart', pm2_name: pm2Name };
  } else {
    // Step 3: Start new process (PM2 prevents duplicates by name)
    await execAsync(`pm2 start ${scriptPath} --name ${pm2Name}`);
    return { method: 'pm2_start', pm2_name: pm2Name, script: scriptPath };
  }
}

/**
 * Restart stage via spawn
 */
async function restartStageSpawn(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
    });
    
    child.unref(); // Allow parent to exit
    
    child.on('error', (error) => {
      reject(error);
    });
    
    // Give it a moment to start
    setTimeout(() => {
      resolve({ method: 'spawn', script: scriptPath });
    }, 100);
  });
}

/**
 * Restart a stage
 * 
 * Deterministic and idempotent:
 * - Checks cooldown first (never restart during cooldown)
 * - Gets script from authoritative mapping (never guesses)
 * - Tries PM2 restart if process exists, else PM2 start
 * - Falls back to spawn if PM2 fails
 * - Records cooldown after successful restart
 * - Clears stall confirmation after restart
 */
async function restartStage(stage) {
  console.log(`[WATCHDOG] Restarting stage: ${stage}`);
  
  // Step 5: Check cooldown (never restart during cooldown window)
  if (isInCooldown(stage)) {
    const lastRestart = state.stageCooldowns.get(stage);
    const remaining = CONFIG.cooldownMs - (Date.now() - lastRestart);
    console.log(`[WATCHDOG] Stage ${stage} is in cooldown (${Math.round(remaining / 1000)}s remaining)`);
    logEvent('restart_blocked', stage, {
      reason: 'cooldown',
      remaining_seconds: Math.round(remaining / 1000),
    });
    return false;
  }
  
  // Get script from authoritative mapping
  const scriptPath = getStageScript(stage);
  
  if (!scriptPath) {
    console.warn(`[WATCHDOG] No script found for stage: ${stage}`);
    logEvent('restart_failed', stage, {
      error: 'script_not_found',
      mapping: STAGE_RUNNERS[stage] || null,
    });
    return false;
  }
  
  try {
    // Try PM2 first
    let result;
    try {
      result = await restartStagePm2(stage, scriptPath);
    } catch (pm2Error) {
      // Fallback to spawn
      console.log(`[WATCHDOG] PM2 restart failed, using spawn: ${pm2Error.message}`);
      result = await restartStageSpawn(scriptPath);
    }
    
    // Record cooldown (prevents rapid restarts)
    state.stageCooldowns.set(stage, Date.now());
    
    // Clear stall confirmation (we've restarted, reset counter)
    clearStallConfirmation(stage);
    
    // Log restart with mapping info
    const mapping = STAGE_RUNNERS[stage];
    logEvent('restart_triggered', stage, {
      ...result,
      mapped_script: mapping?.script,
      mapped_pm2_name: mapping?.pm2Name,
    });
    
    console.log(`[WATCHDOG] Successfully restarted ${stage} via ${result.method}`);
    return true;
  } catch (error) {
    console.error(`[WATCHDOG] Failed to restart ${stage}:`, error.message);
    logEvent('recovery_failed', stage, {
      error: error.message,
    });
    return false;
  }
}

/**
 * Map active_stage name to internal stage key
 */
function mapActiveStageToKey(activeStage) {
  if (!activeStage) return null;
  
  const lower = activeStage.toLowerCase();
  
  if (lower.includes('canonical') || lower.includes('query')) {
    return 'canonical';
  }
  if (lower.includes('harvest') || lower.includes('harvesting')) {
    return 'harvesting';
  }
  if (lower.includes('fingerprint') || lower.includes('fingerprinting')) {
    return 'fingerprinting';
  }
  if (lower.includes('assign') || lower.includes('assignment')) {
    return 'assignment';
  }
  
  return null;
}

/**
 * Check if stage is stalled
 */
function isStageStalled(stage) {
  // Check status
  if (stage.status === 'stalled') {
    return true;
  }
  
  // Check if running but no recent update
  if (stage.status === 'running') {
    if (!stage.last_update) {
      return true;
    }
    
    const lastUpdateTime = new Date(stage.last_update).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    return (now - lastUpdateTime) > tenMinutes;
  }
  
  return false;
}

/**
 * Process status and handle stalls
 */
async function processStatus(status) {
  if (!status) return;
  
  // Store snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    health: status.health,
    active_stage: status.active_stage,
    last_updated: status.last_updated,
    stalled: status.stalled,
    stages: status.stages?.map(s => ({
      name: s.name,
      status: s.status,
      progress: s.progress,
      completed: s.completed,
      total: s.total,
      rate_per_minute: s.rate_per_minute,
      last_update: s.last_update,
      stalled: s.stalled,
    })),
  };
  
  state.statusSnapshots.push(snapshot);
  
  // Keep only last N snapshots
  if (state.statusSnapshots.length > CONFIG.maxSnapshots) {
    state.statusSnapshots.shift();
  }
  
  // Check for errors (log but don't restart)
  if (status.health === 'error') {
    console.warn('[WATCHDOG] Pipeline health is ERROR - logging but NOT auto-restarting');
    logEvent('error_detected', null, {
      health: status.health,
      active_stage: status.active_stage,
      stages: status.stages?.map(s => ({
        name: s.name,
        status: s.status,
        progress: s.progress,
      })),
    });
    return;
  }
  
  // Check for stalls
  if (status.health === 'stalled' || status.stalled === true) {
    console.warn('[WATCHDOG] Pipeline health is STALLED - checking stages...');
    
    // Find stalled stages
    const stalledStages = (status.stages || []).filter(isStageStalled);
    
    if (stalledStages.length === 0) {
      console.log('[WATCHDOG] No stalled stages detected');
      return;
    }
    
    // Identify active stage
    const activeStage = status.active_stage;
    const stageKey = mapActiveStageToKey(activeStage);
    
    if (!stageKey) {
      console.warn(`[WATCHDOG] Unknown active stage: ${activeStage}`);
      return;
    }
    
    // Record stall confirmation
    const confirmationCount = recordStallConfirmation(stageKey);
    console.log(`[WATCHDOG] Stage ${stageKey} stall confirmation: ${confirmationCount}/${CONFIG.stallConfirmations}`);
    
    // Log stall detection with status snapshot
    const stalledStage = stalledStages.find(s => 
      mapActiveStageToKey(s.name) === stageKey
    );
    
    if (stalledStage) {
      logEvent('stall_detected', stageKey, {
        active_stage: activeStage,
        status: stalledStage.status,
        progress: stalledStage.progress,
        completed: stalledStage.completed,
        total: stalledStage.total,
        rate_per_minute: stalledStage.rate_per_minute,
        last_update: stalledStage.last_update,
        confirmation_count: confirmationCount,
      });
    }
    
    // Check if stall is confirmed
    if (isStallConfirmed(stageKey)) {
      console.log(`[WATCHDOG] Stall confirmed for ${stageKey} (${confirmationCount} times) - triggering restart`);
      
      // Log status snapshot for verification (dev-only, once per confirmed stall)
      if (process.env.NODE_ENV !== 'production') {
        const latestSnapshot = state.statusSnapshots[state.statusSnapshots.length - 1];
        console.log('[WATCHDOG] Status snapshot at confirmed stall:', JSON.stringify(latestSnapshot, null, 2));
        logEvent('stall_confirmed_snapshot', stageKey, {
          snapshot: latestSnapshot,
          confirmation_count: confirmationCount,
        });
      }
      
      // Attempt restart
      const success = await restartStage(stageKey);
      
      if (success) {
        logEvent('recovery_success', stageKey, {
          confirmation_count: confirmationCount,
          timestamp: new Date().toISOString(),
          active_stage: activeStage,
          snapshot: process.env.NODE_ENV !== 'production' ? state.statusSnapshots[state.statusSnapshots.length - 1] : undefined,
        });
      }
    } else {
      console.log(`[WATCHDOG] Stall not yet confirmed (${confirmationCount}/${CONFIG.stallConfirmations})`);
    }
  } else {
    // Pipeline is healthy - clear all stall confirmations
    for (const [stage] of state.stallConfirmations) {
      clearStallConfirmation(stage);
    }
  }
}

/**
 * Main watchdog loop
 */
async function watchdogLoop() {
  const timestamp = new Date().toISOString();
  console.log(`[WATCHDOG] Checking pipeline status... (${timestamp})`);
  
  const status = await fetchPipelineStatus();
  await processStatus(status);
}

/**
 * Main entry point
 */
async function main() {
  console.log('========================================');
  console.log('PIPELINE WATCHDOG - AUTO-RECOVERY');
  console.log('========================================\n');
  console.log(`Port: ${CONFIG.port}`);
  console.log(`Poll interval: ${CONFIG.pollIntervalMs / 1000 / 60} minutes`);
  console.log(`Stall confirmations: ${CONFIG.stallConfirmations}`);
  console.log(`Cooldown: ${CONFIG.cooldownMs / 1000 / 60} minutes`);
  console.log(`Status API: ${getStatusApiUrl()}\n`);
  
  // Log startup
  logEvent('watchdog_started', null, {
    port: CONFIG.port,
    poll_interval_minutes: CONFIG.pollIntervalMs / 1000 / 60,
    stall_confirmations: CONFIG.stallConfirmations,
    cooldown_minutes: CONFIG.cooldownMs / 1000 / 60,
  });
  
  // Run initial check
  await watchdogLoop();
  
  // Set up polling interval
  const interval = setInterval(async () => {
    await watchdogLoop();
  }, CONFIG.pollIntervalMs);
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n[WATCHDOG] SIGTERM received, shutting down...');
    clearInterval(interval);
    logEvent('watchdog_stopped', null, { reason: 'SIGTERM' });
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('\n[WATCHDOG] SIGINT received, shutting down...');
    clearInterval(interval);
    logEvent('watchdog_stopped', null, { reason: 'SIGINT' });
    process.exit(0);
  });
  
  // Keep process alive
  console.log('[WATCHDOG] Watchdog running. Press Ctrl+C to stop.\n');
}

// Run
main().catch(error => {
  console.error('[WATCHDOG] Fatal error:', error);
  logEvent('watchdog_error', null, { error: error.message, stack: error.stack });
  process.exit(1);
});
