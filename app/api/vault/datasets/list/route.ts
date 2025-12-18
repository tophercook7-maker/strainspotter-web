/**
 * GET /api/vault/datasets/list
 * List all datasets with statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Dataset operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('List datasets error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list datasets' },
      { status: 500 }
    );
  }
}
