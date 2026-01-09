import "server-only";
/**
 * POST /api/admin/model/test
 * Test matcher v1 and v2 on an uploaded image
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { analyzeImage } from '@/app/api/_utils/vision';
import { findBestMatch, loadStrainLibrary } from '@/app/api/_utils/visualMatch';
import { matchImageToManifest, Manifest } from '@/lib/visualMatcherV2';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function loadManifests(): Promise<Manifest[]> {
  const manifests: Manifest[] = [];

  try {
    // Try Supabase Storage
    if (supabaseAdmin) {
      const { data: files } = await supabaseAdmin.storage
        .from('strains')
        .list('manifests', { limit: 1000 });

      if (files) {
        for (const file of files) {
          if (file.name.endsWith('.json')) {
            try {
              const { data, error } = await supabaseAdmin.storage
                .from('strains')
                .download(`manifests/${file.name}`);

              if (!error && data) {
                const text = await data.text();
                manifests.push(JSON.parse(text));
              }
            } catch (err) {
              // Ignore
            }
          }
        }
      }
    }

    // Fallback: local
    if (manifests.length === 0) {
      try {
        const manifestsDir = join(process.cwd(), 'datasets', 'manifests');
        const files = await readdir(manifestsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await readFile(join(manifestsDir, file), 'utf-8');
            manifests.push(JSON.parse(content));
          }
        }
      } catch (err) {
        // Ignore
      }
    }
  } catch (error) {
    console.error('Failed to load manifests:', error);
  }

  return manifests;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      );
    }

    // Download image
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Run v1 matcher
    const visionResults = await analyzeImage(image_url);
    const strainLibrary = await loadStrainLibrary();
    const v1Result = await findBestMatch(visionResults, strainLibrary);

    // Run v2 matcher
    const manifests = await loadManifests();
    const v2Matches = await Promise.all(
      manifests.map(async (manifest) => {
        try {
          return await matchImageToManifest(
            imageBuffer,
            manifest,
            {
              labels: visionResults.labels,
              text: visionResults.text
            }
          );
        } catch (error) {
          return null;
        }
      })
    );

    const v2Results = v2Matches
      .filter(m => m !== null)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 5);

    return NextResponse.json({
      v1: {
        match: v1Result.match,
        alternatives: v1Result.alternatives.slice(0, 5)
      },
      v2: {
        top: v2Results[0] || null,
        alternatives: v2Results.slice(1)
      }
    });
  } catch (error: any) {
    console.error('Test matcher error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test matcher' },
      { status: 500 }
    );
  }
}
