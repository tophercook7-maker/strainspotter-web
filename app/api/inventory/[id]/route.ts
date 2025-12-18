// /app/api/inventory/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify user is authenticated
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = await createSupabaseServer();

    // Fetch inventory item
    const { data, error } = await supabase
      .from('grower_inventory')
      .select('*')
      .eq('id', id)
      .eq('grower_id', user.id) // Ensure user owns this item
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
