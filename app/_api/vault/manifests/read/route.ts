import "server-only";
/**
 * GET /api/vault/manifests/read
 * Read manifest content
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const strain = searchParams.get('strain');

    if (!strain) {
      return NextResponse.json({ error: 'strain is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Manifest operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Read manifest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read manifest' },
      { status: 500 }
    );
  }
}
