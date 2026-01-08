import "server-only";
/**
 * POST /api/visual-match/v3
 * Advanced visual matching with augmentation and LLM explanations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { analyzeImage } from '@/app/api/_utils/vision';
import { matchImageToManifestV3 } from '@/lib/visualMatcherV3';
import { Manifest } from '@/lib/visualMatcherV2';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

async function loadManifests(includePrivate = false, userId?: string): Promise<Manifest[]> {
  const manifests: Manifest[] = [];

  try {
    // Load public manifests
    if (!supabaseUrl || !supabaseKey) {
      return manifests;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: files } = await supabase.storage
      .from('strains')
      .list('manifests', { limit: 1000 });

    if (files) {
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          try {
            const { data, error } = await supabase.storage
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

    // Load private manifests if requested
    if (includePrivate && userId) {
      try {
        const privateDir = join(process.cwd(), 'datasets', 'private_manifests', userId);
        const files = await readdir(privateDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await readFile(join(privateDir, file), 'utf-8');
            manifests.push(JSON.parse(content));
          }
        }
      } catch (err) {
        // No private manifests
      }
    }

    // Fallback: local manifests
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

async function loadMatcherConfig() {
  if (!supabaseAdmin) {
    return {
      weight_phash: 0.15,
      weight_color: 0.10,
      weight_texture: 0.10,
      weight_embedding: 0.35,
      weight_cluster: 0.20,
      weight_label: 0.10
    };
  }

  try {
    const { data } = await supabaseAdmin
      .from('matcher_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return {
        weight_phash: data.weight_phash || 0.15,
        weight_color: data.weight_color || 0.10,
        weight_texture: data.weight_texture || 0.10,
        weight_embedding: data.weight_embedding || 0.35,
        weight_cluster: 0.20, // Fixed for v3
        weight_label: data.weight_label || 0.10
      };
    }
  } catch (error) {
    // Use defaults
  }

  return {
    weight_phash: 0.15,
    weight_color: 0.10,
    weight_texture: 0.10,
    weight_embedding: 0.35,
    weight_cluster: 0.20,
    weight_label: 0.10
  };
}

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
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, scan_id } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    console.log(`🔍 Visual match v3 for image: ${image_url}`);

    // Download image
    const imageBuffer = await downloadImage(image_url);

    // Extract vision features
    const visionResults = await analyzeImage(image_url);

    // Load manifests (include private if pro user)
    const isPro = user.role === 'pro' || user.role === 'ultimate';
    const manifests = await loadManifests(isPro, user.id);

    if (manifests.length === 0) {
      return NextResponse.json(
        { error: 'No strain manifests found' },
        { status: 404 }
      );
    }

    // Load config
    const config = await loadMatcherConfig();

    // Load clusters
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
          // No clusters
        }
      }
    } catch (err) {
      // Ignore
    }

    // Augmentation not available in web repo - skip robust embedding
    let robustEmbedding: number[] | null = null as number[] | null;
    let variants = 1;

    // Match against all manifests
    const matches = [];
    for (const manifest of manifests) {
      try {
        const clusters = clustersMap.get(manifest.strain);
        
        // Use robust embedding if available
        const manifestWithRobust: Manifest = robustEmbedding ? {
          ...manifest,
          embeddings: [robustEmbedding, ...(manifest.embeddings || [])]
        } : manifest;

        const match = await matchImageToManifestV3(
          imageBuffer,
          manifestWithRobust,
          {
            labels: visionResults.labels,
            text: visionResults.text
          },
          config,
          clusters
        );
        matches.push(match);
      } catch (error) {
        console.warn(`Failed to match ${manifest.strain}:`, error);
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No matches found' }, { status: 404 });
    }

    const topMatch = matches[0];
    const alternatives = matches.slice(1, 6);

    // Get strain metadata for explanation
    let strainMetadata = {};
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('strains')
          .select('*')
          .eq('slug', topMatch.strain)
          .single();
        if (data) strainMetadata = data;
      } catch (err) {
        // Ignore
      }
    }

    // LLM explanation not available in web repo
    const explanation = `Match confidence: ${(topMatch.score * 100).toFixed(1)}%`;

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
              breakdown: topMatch.breakdown,
              explanation,
              version: 'v3'
            },
            alternatives: alternatives.map(a => ({
              name: a.strain,
              slug: a.strain,
              confidence: a.score,
              breakdown: a.breakdown
            }))
          }
        });
      } catch (error) {
        console.warn('Failed to save match result:', error);
      }
    }

    return NextResponse.json({
      match: {
        strain: topMatch.strain,
        score: topMatch.score,
        breakdown: topMatch.breakdown,
        explanation,
        robustEmbedding: robustEmbedding ? robustEmbedding.slice(0, 10) : undefined, // Preview
        variants: variants
      },
      alternatives: alternatives.map(a => ({
        strain: a.strain,
        score: a.score,
        breakdown: a.breakdown
      })),
      version: 'v3'
    });
  } catch (error: any) {
    console.error('Visual match v3 error:', error);
    return NextResponse.json(
      { error: error.message || 'Visual matching failed' },
      { status: 500 }
    );
  }
}
