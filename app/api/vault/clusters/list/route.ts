/**
 * GET /api/vault/clusters/list
 * List clusters for a strain
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { existsSync } from 'fs';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const strain = searchParams.get('strain');

    if (!strain) {
      return NextResponse.json({ error: 'strain is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Cluster operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('List clusters error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list clusters' },
      { status: 500 }
    );
  }
}
