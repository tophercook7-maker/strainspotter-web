/**
 * GET /api/vault/models/list
 * List all registered models
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from('model_registry')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ models: data || [] });
  } catch (error: any) {
    console.error('List models error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list models' },
      { status: 500 }
    );
  }
}
