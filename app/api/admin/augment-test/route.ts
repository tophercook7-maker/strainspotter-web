/**
 * POST /api/admin/augment-test
 * Test image augmentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { uploadToStorage } from '@/app/api/_utils/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url required' }, { status: 400 });
    }

    // Augmentation not available in web repo
    return NextResponse.json(
      { error: 'Image augmentation not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Augment test error:', error);
    return NextResponse.json(
      { error: error.message || 'Augmentation test failed' },
      { status: 500 }
    );
  }
}
