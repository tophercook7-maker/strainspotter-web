import "server-only";
/**
 * POST /api/visual-match/v2
 * Advanced visual matching using manifest-based scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { analyzeImage, VisionResults } from '@/app/api/_utils/vision';
import { matchImageToManifest, Manifest } from '@/lib/visualMatcherV2';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Load matcher config from Supabase
 */
async function loadMatcherConfig() {
  if (!supabaseAdmin) {
    return {
      weight_phash: 0.25,
      weight_color: 0.20,
      weight_texture: 0.25,
      weight_embedding: 0.20,
      weight_label: 0.10
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('matcher_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        weight_phash: 0.25,
        weight_color: 0.20,
        weight_texture: 0.25,
        weight_embedding: 0.20,
        weight_label: 0.10
      };
    }

    return {
      weight_phash: data.weight_phash,
      weight_color: data.weight_color,
      weight_texture: data.weight_texture,
      weight_embedding: data.weight_embedding,
      weight_label: data.weight_label
    };
  } catch (error) {
    console.warn('Failed to load matcher config, using defaults:', error);
    return {
      weight_phash: 0.25,
      weight_color: 0.20,
      weight_texture: 0.25,
      weight_embedding: 0.20,
      weight_label: 0.10
    };
  }
}

/**
 * Loads all manifests from Supabase Storage or local cache
 */
async function loadManifests(): Promise<Manifest[]> {
  const manifests: Manifest[] = [];

  try {
    // Try to load from Supabase Storage first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: files, error } = await supabase.storage
      .from('strains')
      .list('manifests', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (!error && files) {
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          try {
            const { data, error: downloadError } = await supabase.storage
              .from('strains')
              .download(`manifests/${file.name}`);

            if (!downloadError && data) {
              const text = await data.text();
              const manifest = JSON.parse(text) as Manifest;
              manifests.push(manifest);
            }
          } catch (err) {
            console.warn(`Failed to load manifest ${file.name}:`, err);
          }
        }
      }
    }

    // Fallback: try local manifests directory
    if (manifests.length === 0) {
      try {
        const manifestsDir = join(process.cwd(), 'datasets', 'manifests');
        const files = await readdir(manifestsDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = await readFile(join(manifestsDir, file), 'utf-8');
              const manifest = JSON.parse(content) as Manifest;
              manifests.push(manifest);
            } catch (err) {
              console.warn(`Failed to load local manifest ${file}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn('Local manifests directory not found:', err);
      }
    }
  } catch (error) {
    console.error('Failed to load manifests:', error);
  }

  return manifests;
}

/**
 * Downloads image from URL and returns buffer
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { image_url, scan_id } = body;

    if (!image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Visual match v2 for image: ${image_url}`);

    // Step 1: Download image
    const imageBuffer = await downloadImage(image_url);

    // Step 2: Extract vision features (labels, text)
    const visionResults = await analyzeImage(image_url);

    // Step 3: Load all manifests
    console.log('📋 Loading manifests...');
    const manifests = await loadManifests();
    
    if (manifests.length === 0) {
      return NextResponse.json(
        { error: 'No strain manifests found. Run the data pipeline first.' },
        { status: 404 }
      );
    }

    console.log(`  Loaded ${manifests.length} strain manifests`);

    // Step 4: Load matcher config
    const config = await loadMatcherConfig();
    console.log('⚙️  Using matcher config:', config);

    // Step 5: Score each strain
    console.log('🎯 Matching against manifests...');
    const matches: Array<{
      strain: string;
      score: number;
      breakdown: {
        pHash: number;
        color: number;
        texture: number;
        embedding: number;
        labelText: number;
      };
    }> = [];

    // Load clusters if available
    const clustersMap = new Map<string, any[]>();
    try {
      const clustersDir = join(process.cwd(), 'datasets', 'clusters');
      for (const manifest of manifests) {
        const clusterPath = join(clustersDir, `${manifest.strain}_clusters.json`);
        try {
          const clusterContent = await readFile(clusterPath, 'utf-8');
          const clusterData = JSON.parse(clusterContent);
          clustersMap.set(manifest.strain, clusterData.clusters || []);
        } catch (err) {
          // No clusters for this strain
        }
      }
    } catch (err) {
      console.warn('Failed to load clusters:', err);
    }

    for (const manifest of manifests) {
      try {
        const clusters = clustersMap.get(manifest.strain);
        const match = await matchImageToManifest(
          imageBuffer,
          manifest,
          {
            labels: visionResults.labels,
            text: visionResults.text
          },
          {
            ...config,
            weight_cluster: 0.15
          },
          clusters
        );
        matches.push(match);
      } catch (error) {
        console.warn(`Failed to match ${manifest.strain}:`, error);
      }
    }

    // Step 5: Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'No matches found' },
        { status: 404 }
      );
    }

    // Step 6: Get top match and alternatives
    const topMatch = matches[0];
    const alternatives = matches.slice(1, 6).map(m => ({
      strain: m.strain,
      score: m.score,
      breakdown: m.breakdown
    }));

    // Generate reasoning
    const reasoning = generateReasoning(topMatch.breakdown);

    // Save to scan if scan_id provided
    if (scan_id) {
      try {
        const { updateScan } = await import('@/app/api/_utils/supabaseAdmin');
        await updateScan(scan_id, {
          match_result: {
            match: {
              name: topMatch.strain,
              slug: topMatch.strain,
              confidence: topMatch.score,
              reasoning,
              breakdown: topMatch.breakdown
            },
            alternatives: alternatives.map(a => ({
              name: a.strain,
              slug: a.strain,
              confidence: a.score,
              reasoning: generateReasoning(a.breakdown)
            }))
          }
        });
      } catch (error) {
        console.warn('Failed to save match result to scan:', error);
      }
    }

    return NextResponse.json({
      match: {
        strain: topMatch.strain,
        score: topMatch.score,
        reasoning,
        breakdown: topMatch.breakdown
      },
      alternatives: alternatives.map(a => ({
        strain: a.strain,
        score: a.score,
        reasoning: generateReasoning(a.breakdown),
        breakdown: a.breakdown
      })),
      breakdown: topMatch.breakdown,
      total_compared: matches.length
    });
  } catch (error: any) {
    console.error('Visual match v2 error:', error);
    return NextResponse.json(
      { error: error.message || 'Visual matching failed' },
      { status: 500 }
    );
  }
}

/**
 * Generate human-readable reasoning from breakdown
 */
function generateReasoning(breakdown: {
  pHash: number;
  color: number;
  texture: number;
  embedding: number;
  labelText: number;
}): string {
  const parts: string[] = [];

  if (breakdown.pHash > 70) {
    parts.push(`Strong visual similarity (${breakdown.pHash}%)`);
  } else if (breakdown.pHash > 50) {
    parts.push(`Moderate visual match (${breakdown.pHash}%)`);
  }

  if (breakdown.color > 60) {
    parts.push(`Color profile match (${breakdown.color}%)`);
  }

  if (breakdown.texture > 60) {
    parts.push(`Texture similarity (${breakdown.texture}%)`);
  }

  if (breakdown.embedding > 70) {
    parts.push(`High embedding similarity (${breakdown.embedding}%)`);
  }

  if (breakdown.labelText > 50) {
    parts.push(`Text/label indicators (${breakdown.labelText}%)`);
  }

  return parts.length > 0 
    ? parts.join(', ')
    : 'Limited match indicators found';
}
