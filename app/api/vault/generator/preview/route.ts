/**
 * GET /api/vault/generator/preview
 * Get preview images for a strain
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
      { error: 'Generator operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get preview' },
      { status: 500 }
    );
  }
}
