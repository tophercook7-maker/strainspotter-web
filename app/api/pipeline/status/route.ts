/**
 * GET /api/pipeline/status
 * Returns pipeline status for internal dashboard
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PipelineStage {
  name: string;
  status: 'idle' | 'running' | 'complete' | 'stalled' | 'error';
  progress: number; // 0-100
  completed: number;
  total: number;
  rate_per_minute: number;
  last_update: string;
  stalled?: boolean;
}

interface PipelineStatus {
  active_stage: string | null;
  health: 'ok' | 'stalled' | 'error';
  last_updated: string;
  stages: PipelineStage[];
}

/**
 * Load scraper state
 */
function loadScraperState() {
  const path = join(process.cwd(), 'scraper_state.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      return null;
    }
  }
  return null;
}

/**
 * Load harvest progress
 */
function loadHarvestProgress() {
  const path = join(process.cwd(), 'progress_harvest.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      return null;
    }
  }
  return null;
}

/**
 * Load assignment progress
 */
function loadAssignmentProgress() {
  const path = join(process.cwd(), 'assignment_progress.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      return null;
    }
  }
  return null;
}

/**
 * Load canonical progress
 */
function loadCanonicalProgress() {
  const path = join(process.cwd(), 'canonical_progress.json');
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      return null;
    }
  }
  return null;
}

/**
 * Check if stage is stalled (no update in last 5 minutes)
 */
function isStalled(lastUpdate: string): boolean {
  if (!lastUpdate) return true;
  const lastUpdateTime = new Date(lastUpdate).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - lastUpdateTime) > fiveMinutes;
}

/**
 * Calculate rate per minute (simple estimation)
 * Uses time since last update, or estimates from total time if no recent update
 */
function calculateRate(completed: number, lastUpdate: string, startTime?: string): number {
  if (completed === 0) return 0;
  
  let minutesElapsed = 1; // Default to 1 minute to avoid division by zero
  
  if (lastUpdate) {
    const lastUpdateTime = new Date(lastUpdate).getTime();
    const now = Date.now();
    minutesElapsed = Math.max(1, (now - lastUpdateTime) / (60 * 1000));
  } else if (startTime) {
    const startTimeMs = new Date(startTime).getTime();
    const now = Date.now();
    minutesElapsed = Math.max(1, (now - startTimeMs) / (60 * 1000));
  }
  
  return Math.round(completed / minutesElapsed);
}

export async function GET() {
  try {
    const scraperState = loadScraperState();
    const harvestProgress = loadHarvestProgress();
    const assignProgress = loadAssignmentProgress();
    const canonicalProgress = loadCanonicalProgress();

    const stages: PipelineStage[] = [];
    let activeStage: string | null = null;
    let overallHealth: 'ok' | 'stalled' | 'error' = 'ok';

    // Stage 1: Canonical Query Generation
    const canonicalQueriesPath = join(process.cwd(), 'canonical_queries.json');
    const hasCanonicalQueries = existsSync(canonicalQueriesPath);
    const canonicalStatus: PipelineStage = {
      name: 'Canonical Query Generation',
      status: hasCanonicalQueries ? 'complete' : 'idle',
      progress: hasCanonicalQueries ? 100 : 0,
      completed: hasCanonicalQueries ? 1 : 0,
      total: 1,
      rate_per_minute: 0,
      last_update: hasCanonicalQueries ? new Date().toISOString() : '',
    };
    stages.push(canonicalStatus);

    // Stage 2: Image Harvesting
    if (canonicalProgress) {
      const total = canonicalProgress.total_queries || 0;
      const completed = canonicalProgress.completed_queries || 0;
      const lastUpdate = canonicalProgress.last_updated || '';
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const stalled = isStalled(lastUpdate);
      const status = (scraperState?.harvesting_complete
        ? 'complete'
        : stalled
        ? 'stalled'
        : completed > 0
        ? 'running'
        : 'idle') as PipelineStage['status'];

      if (status === 'running') activeStage = 'Image Harvesting';
      if (status === 'stalled') overallHealth = 'stalled';
      if (status === 'error') overallHealth = 'error';

      stages.push({
        name: 'Image Harvesting',
        status,
        progress,
        completed,
        total,
        rate_per_minute: calculateRate(completed, lastUpdate, canonicalProgress.last_updated),
        last_update: lastUpdate,
        stalled,
      });
    } else {
      stages.push({
        name: 'Image Harvesting',
        status: 'idle',
        progress: 0,
        completed: 0,
        total: 0,
        rate_per_minute: 0,
        last_update: '',
      });
    }

    // Stage 3: Strain Assignment
    if (assignProgress) {
      const lastUpdate = assignProgress.updated_at || '';
      const lastIndex = assignProgress.last_processed_index || 0;
      // Estimate total from strains.json or use last index as proxy
      const total = lastIndex > 0 ? Math.max(lastIndex, 35000) : 35000;
      const completed = lastIndex;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const stalled = isStalled(lastUpdate);
      const status = (scraperState?.assignment_complete
        ? 'complete'
        : stalled
        ? 'stalled'
        : completed > 0
        ? 'running'
        : 'idle') as PipelineStage['status'];

      if (status === 'running') activeStage = 'Strain Assignment';
      if (status === 'stalled') overallHealth = 'stalled';
      if (status === 'error') overallHealth = 'error';

      stages.push({
        name: 'Strain Assignment',
        status,
        progress,
        completed,
        total,
        rate_per_minute: calculateRate(completed, lastUpdate, assignProgress.updated_at),
        last_update: lastUpdate,
        stalled,
      });
    } else {
      stages.push({
        name: 'Strain Assignment',
        status: 'idle',
        progress: 0,
        completed: 0,
        total: 0,
        rate_per_minute: 0,
        last_update: '',
      });
    }

    // Stage 4: Fingerprinting (optional)
    const fingerprintProgressPath = join(process.cwd(), 'fingerprint_progress.json');
    if (existsSync(fingerprintProgressPath)) {
      try {
        const fpProgress = JSON.parse(readFileSync(fingerprintProgressPath, 'utf-8'));
        const lastUpdate = fpProgress.updated_at || '';
        const lastIndex = fpProgress.last_processed_index || 0;
        // Estimate total from image_pool.json
        const imagePoolPath = join(process.cwd(), 'image_pool.json');
        let total = 0;
        if (existsSync(imagePoolPath)) {
          try {
            const pool = JSON.parse(readFileSync(imagePoolPath, 'utf-8'));
            total = Array.isArray(pool) ? pool.length : 0;
          } catch (err) {
            // Ignore
          }
        }
        const completed = lastIndex;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const stalled = isStalled(lastUpdate);
        const status = (stalled ? 'stalled' : completed > 0 ? 'running' : 'idle') as PipelineStage['status'];

        if (status === 'running') activeStage = 'Fingerprinting';
        if (status === 'stalled') overallHealth = 'stalled';

        stages.push({
          name: 'Fingerprinting',
          status,
          progress,
          completed,
          total,
          rate_per_minute: calculateRate(completed, lastUpdate, fpProgress.updated_at),
          last_update: lastUpdate,
          stalled,
        });
      } catch (err) {
        // Skip if can't parse
      }
    }

    const response: PipelineStatus = {
      active_stage: activeStage,
      health: overallHealth,
      last_updated: new Date().toISOString(),
      stages,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[PIPELINE STATUS] Error:', error);
    return NextResponse.json(
      {
        active_stage: null,
        health: 'error',
        last_updated: new Date().toISOString(),
        stages: [],
        error: error.message,
      },
      { status: 500 }
    );
  }
}
