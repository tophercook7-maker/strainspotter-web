import "server-only";
/**
 * GET /api/admin/dataset/stats
 * Get global dataset statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin not initialized' },
        { status: 500 }
      );
    }

    // Get strains from Supabase
    const { data: strains, error: strainsError } = await supabaseAdmin
      .from('strains')
      .select('slug, name, created_at, updated_at')
      .order('name');

    if (strainsError) {
      throw new Error(`Failed to load strains: ${strainsError.message}`);
    }

    // Get dataset updates
    const { data: updates } = await supabaseAdmin
      .from('dataset_updates')
      .select('strain, event, created_at, status')
      .order('created_at', { ascending: false });

    // Calculate stats
    let totalRealImages = 0;
    let totalSyntheticImages = 0;
    let manifestCount = 0;
    let oldestDataset: string | null = null;
    let mostRecentUpdate: string | null = null;

    const datasetsDir = join(process.cwd(), 'datasets');
    const manifestsDir = join(datasetsDir, 'manifests');

    if (existsSync(manifestsDir)) {
      try {
        const manifestFiles = await readdir(manifestsDir);
        manifestCount = manifestFiles.filter(f => f.endsWith('.json')).length;
      } catch (err) {
        console.warn('Failed to read manifests directory:', err);
      }
    }

    // Try to get image counts from storage or local
    const strainStats = await Promise.all(
      (strains || []).map(async (strain) => {
        const realDir = join(datasetsDir, 'strains', strain.slug, 'real');
        const syntheticDir = join(datasetsDir, 'strains', strain.slug, 'synthetic');
        const manifestPath = join(manifestsDir, `${strain.slug}.json`);

        let realCount = 0;
        let syntheticCount = 0;
        let hasManifest = false;
        let lastScraped: string | null = null;
        let lastGenerated: string | null = null;
        let lastManifest: string | null = null;

        // Check local directories
        if (existsSync(realDir)) {
          try {
            const files = await readdir(realDir);
            realCount = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
            totalRealImages += realCount;
          } catch (err) {
            // Ignore
          }
        }

        if (existsSync(syntheticDir)) {
          try {
            const files = await readdir(syntheticDir);
            syntheticCount = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
            totalSyntheticImages += syntheticCount;
          } catch (err) {
            // Ignore
          }
        }

        if (existsSync(manifestPath)) {
          hasManifest = true;
          try {
            const stats = await stat(manifestPath);
            lastManifest = stats.mtime.toISOString();
          } catch (err) {
            // Ignore
          }
        }

        // Get last update times from database
        const strainUpdates = (updates || []).filter(u => u.strain === strain.slug);
        const lastScrape = strainUpdates.find(u => u.event === 'scrape' && u.status === 'completed');
        const lastGen = strainUpdates.find(u => u.event === 'generate' && u.status === 'completed');
        
        if (lastScrape) lastScraped = lastScrape.created_at;
        if (lastGen) lastGenerated = lastGen.created_at;

        // Track oldest dataset
        if (realCount > 0 || syntheticCount > 0) {
          const dirs = [realDir, syntheticDir].filter(existsSync);
          if (dirs.length > 0) {
            try {
              const stats = await Promise.all(dirs.map(d => stat(d)));
              const oldest = stats.reduce((oldest, s) => 
                s.mtime < oldest.mtime ? s : oldest
              );
              if (!oldestDataset || oldest.mtime.toISOString() < oldestDataset) {
                oldestDataset = oldest.mtime.toISOString();
              }
            } catch (err) {
              // Ignore
            }
          }
        }

        return {
          slug: strain.slug,
          name: strain.name,
          realImages: realCount,
          syntheticImages: syntheticCount,
          hasManifest,
          lastScraped,
          lastGenerated,
          lastManifest
        };
      })
    );

    // Find most recent update
    if (updates && updates.length > 0) {
      const completed = updates.filter(u => u.status === 'completed');
      if (completed.length > 0) {
        mostRecentUpdate = completed[0].created_at;
      }
    }

    return NextResponse.json({
      totalStrains: strains?.length || 0,
      totalRealImages,
      totalSyntheticImages,
      manifestCount,
      oldestDataset,
      mostRecentUpdate,
      strains: strainStats
    });
  } catch (error: any) {
    console.error('Dataset stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get dataset stats' },
      { status: 500 }
    );
  }
}
