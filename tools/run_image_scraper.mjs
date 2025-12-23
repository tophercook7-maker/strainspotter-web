#!/usr/bin/env node

/**
 * Image Scraper Runner - PM2-Ready
 * 
 * Wraps image_scraper_v2.mjs with:
 * - State management
 * - Crash safety
 * - PM2 compatibility
 * - Unstoppable execution
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const STATE_FILE = 'scraper_state.json';

/**
 * Load scraper state
 */
function loadState() {
  const path = join(process.cwd(), STATE_FILE);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      console.warn('[RUNNER] Failed to load state:', err.message);
    }
  }
  return {
    harvesting_complete: false,
    assignment_complete: false,
    last_updated: null,
  };
}

/**
 * Save scraper state
 */
function saveState(state) {
  const path = join(process.cwd(), STATE_FILE);
  writeFileSync(path, JSON.stringify({
    ...state,
    last_updated: new Date().toISOString(),
  }, null, 2));
}

/**
 * Check if harvesting is complete
 */
function isHarvestingComplete() {
  const state = loadState();
  if (state.harvesting_complete) {
    return true;
  }

  // Check if progress file indicates completion
  const progressPath = join(process.cwd(), 'progress_harvest.json');
  const queriesPath = join(process.cwd(), 'canonical_queries.json');
  
  if (existsSync(progressPath) && existsSync(queriesPath)) {
    try {
      const progress = JSON.parse(readFileSync(progressPath, 'utf-8'));
      const queries = JSON.parse(readFileSync(queriesPath, 'utf-8'));
      
      if (progress.last_processed_index >= queries.length - 1) {
        // Mark as complete
        saveState({ ...state, harvesting_complete: true });
        return true;
      }
    } catch (err) {
      // Continue
    }
  }

  return false;
}

/**
 * Check if assignment is complete
 */
function isAssignmentComplete() {
  const state = loadState();
  if (state.assignment_complete) {
    return true;
  }

  // Check if progress file indicates completion
  const progressPath = join(process.cwd(), 'progress_assign.json');
  const strainsPath = join(process.cwd(), 'strains.json');
  
  // Try to determine total strains count
  let totalStrains = 0;
  
  // Try Supabase count or JSON file
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Will be checked in scraper
    totalStrains = 35000; // Assume 35k for now
  } else if (existsSync(strainsPath)) {
    try {
      const strains = JSON.parse(readFileSync(strainsPath, 'utf-8'));
      totalStrains = Array.isArray(strains) ? strains.length : 0;
    } catch (err) {
      // Ignore
    }
  }

  if (existsSync(progressPath) && totalStrains > 0) {
    try {
      const progress = JSON.parse(readFileSync(progressPath, 'utf-8'));
      
      if (progress.last_processed_index >= totalStrains - 1) {
        // Mark as complete
        saveState({ ...loadState(), assignment_complete: true });
        return true;
      }
    } catch (err) {
      // Continue
    }
  }

  return false;
}

/**
 * Run scraper with crash safety
 */
async function runScraper() {
  return new Promise((resolve, reject) => {
    const scraperPath = join(process.cwd(), 'tools/image_scraper_v2.mjs');
    
    console.log('[RUNNER] Starting image scraper...\n');

    const child = spawn('node', [scraperPath], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('\n[RUNNER] Scraper completed successfully');
        resolve(code);
      } else {
        console.error(`\n[RUNNER] Scraper exited with code ${code}`);
        // Don't reject - allow resume
        resolve(code);
      }
    });

    child.on('error', (error) => {
      console.error('[RUNNER] Failed to start scraper:', error);
      reject(error);
    });
  });
}

/**
 * Main runner
 */
async function main() {
  console.log('========================================');
  console.log('IMAGE SCRAPER RUNNER - PM2 READY');
  console.log('========================================\n');

  const state = loadState();
  console.log('[RUNNER] Current state:');
  console.log(`  - Harvesting complete: ${state.harvesting_complete}`);
  console.log(`  - Assignment complete: ${state.assignment_complete}`);
  console.log(`  - Last updated: ${state.last_updated || 'Never'}\n`);

  // Check completion status
  const harvestDone = isHarvestingComplete();
  const assignDone = isAssignmentComplete();

  if (harvestDone && assignDone) {
    console.log('[RUNNER] All phases complete. Exiting.\n');
    process.exit(0);
  }

  // Run scraper (it will resume from progress files)
  try {
    await runScraper();

    // Update state after run
    const newState = {
      harvesting_complete: isHarvestingComplete(),
      assignment_complete: isAssignmentComplete(),
      last_updated: new Date().toISOString(),
    };

    saveState(newState);

    console.log('\n[RUNNER] State updated:');
    console.log(`  - Harvesting complete: ${newState.harvesting_complete}`);
    console.log(`  - Assignment complete: ${newState.assignment_complete}\n`);

    // If both complete, exit; otherwise PM2 will restart
    if (newState.harvesting_complete && newState.assignment_complete) {
      console.log('[RUNNER] All work complete. Exiting.\n');
      process.exit(0);
    } else {
      console.log('[RUNNER] Work incomplete. PM2 will restart.\n');
      process.exit(0); // Exit cleanly, PM2 will restart
    }
  } catch (error) {
    console.error('[RUNNER] Fatal error:', error);
    // Exit with error code so PM2 knows to restart
    process.exit(1);
  }
}

// Handle signals gracefully
process.on('SIGTERM', () => {
  console.log('\n[RUNNER] SIGTERM received, exiting gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[RUNNER] SIGINT received, exiting gracefully...');
  process.exit(0);
});

// Run
main().catch(error => {
  console.error('[RUNNER] Fatal error:', error);
  process.exit(1);
});
