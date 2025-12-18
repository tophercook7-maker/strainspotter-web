/**
 * GET /api/admin/clusters/[strain]
 * Get clusters for a strain
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ strain: string }> }
) {
  try {
    await requireAdminAPI();

    const { strain: strainSlug } = await params;
    const clustersPath = join(process.cwd(), 'datasets', 'clusters', `${strainSlug}_clusters.json`);

    if (!existsSync(clustersPath)) {
      return NextResponse.json(
        { error: 'Clusters not found. Run clustering first.' },
        { status: 404 }
      );
    }

    const content = await readFile(clustersPath, 'utf-8');
    const clusters = JSON.parse(content);

    return NextResponse.json(clusters);
  } catch (error: any) {
    console.error('Get clusters error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load clusters' },
      { status: 500 }
    );
  }
}
