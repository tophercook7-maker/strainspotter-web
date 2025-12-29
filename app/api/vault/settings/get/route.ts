import "server-only";
/**
 * GET /api/vault/settings/get
 * Get vault settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Vault settings not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get vault settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    );
  }
}
