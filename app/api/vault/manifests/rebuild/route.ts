/**
 * POST /api/vault/manifests/rebuild
 * Rebuild manifest for a strain
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
      { error: 'Manifest operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Rebuild manifest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rebuild manifest' },
      { status: 500 }
    );
  }
}
