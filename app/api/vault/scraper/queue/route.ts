/**
 * GET /api/vault/scraper/queue
 * Get scraper queue status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Scraper operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get scraper queue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue' },
      { status: 500 }
    );
  }
}
