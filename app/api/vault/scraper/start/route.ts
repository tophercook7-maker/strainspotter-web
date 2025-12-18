/**
 * POST /api/vault/scraper/start
 * Start a new scrape job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { strain, maxImages = 100 } = body;

    if (!strain) {
      return NextResponse.json({ error: 'strain is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Scraper operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Start scrape error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start scrape' },
      { status: 500 }
    );
  }
}
