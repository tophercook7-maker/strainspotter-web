import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/scraper-status
 * Reads scraper_state.json and progress_harvest.json from project root.
 * Safe to call from browser; returns 200 with status or empty state.
 */
export async function GET() {
  const root = process.cwd();
  const statePath = join(root, 'scraper_state.json');
  const harvestPath = join(root, 'progress_harvest.json');
  const assignPath = join(root, 'assignment_progress.json');
  const poolPath = join(root, 'image_pool.json');

  let state: Record<string, unknown> = {};
  let harvestProgress: { last_processed_index?: number; updated_at?: string } = {};
  let assignProgress: { last_processed_index?: number } = {};
  let poolLength = 0;

  try {
    if (existsSync(statePath)) {
      state = JSON.parse(readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // ignore
  }

  try {
    if (existsSync(harvestPath)) {
      harvestProgress = JSON.parse(readFileSync(harvestPath, 'utf-8'));
    }
  } catch {
    // ignore
  }

  try {
    if (existsSync(assignPath)) {
      assignProgress = JSON.parse(readFileSync(assignPath, 'utf-8'));
    }
  } catch {
    // ignore
  }

  try {
    if (existsSync(poolPath)) {
      const pool = JSON.parse(readFileSync(poolPath, 'utf-8'));
      poolLength = Array.isArray(pool) ? pool.length : 0;
    }
  } catch {
    // ignore
  }

  const lastUpdated = (state.last_updated as string) || null;
  const likelyRunning =
    lastUpdated &&
    Date.now() - new Date(lastUpdated).getTime() < 3 * 60 * 1000; // updated in last 3 min

  return NextResponse.json({
    state: {
      harvesting_complete: state.harvesting_complete ?? false,
      harvesting_partial: state.harvesting_partial ?? false,
      assignment_complete: state.assignment_complete ?? false,
      last_updated: lastUpdated,
    },
    progress: {
      last_processed_index: harvestProgress.last_processed_index ?? 0,
      total_queries: 4000,
      updated_at: harvestProgress.updated_at ?? null,
      assignment_index: assignProgress.last_processed_index ?? 0,
      total_strains: 35550,
      pool_images: poolLength,
    },
    likely_running: !!likelyRunning,
  });
}
