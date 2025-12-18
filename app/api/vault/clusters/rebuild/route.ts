/**
 * POST /api/vault/clusters/rebuild
 * Rebuild clusters for a strain
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { strain } = body;

    if (!strain) {
      return NextResponse.json({ error: 'strain is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Cluster operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Rebuild clusters error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rebuild clusters' },
      { status: 500 }
    );
  }
}
