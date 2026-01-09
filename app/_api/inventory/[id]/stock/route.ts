import "server-only";
// /app/api/inventory/[id]/stock/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(
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

    const body = await req.json();
    const { delta } = body;

    if (typeof delta !== 'number') {
      return NextResponse.json(
        { error: 'Delta must be a number' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createSupabaseServer();

    // Get current stock
    const { data: current, error: fetchError } = await supabase
      .from('grower_inventory')
      .select('units_available')
      .eq('id', id)
      .eq('grower_id', user.id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      );
    }

    const newStock = (current.units_available || 0) + delta;

    // Prevent negative stock
    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Stock cannot be negative' },
        { status: 400 }
      );
    }

    // Update stock
    const { data, error } = await supabase
      .from('grower_inventory')
      .update({
        units_available: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('grower_id', user.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
