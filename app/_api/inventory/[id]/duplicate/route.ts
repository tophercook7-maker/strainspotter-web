import "server-only";
// /app/api/inventory/[id]/duplicate/route.ts

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

    // Create Supabase client
    const supabase = await createSupabaseServer();

    // Get the original product
    const { data: original, error: fetchError } = await supabase
      .from('grower_inventory')
      .select('*')
      .eq('id', id)
      .eq('grower_id', user.id) // Ensure user owns this item
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create duplicate (exclude id and timestamps, reset some fields)
    const { id: _, created_at: __, updated_at: ___, ...duplicateData } = original;

    const newProduct = {
      ...duplicateData,
      name: `${original.name} (Copy)`,
      units_available: 0, // Reset stock for new product
      status: 'active',
      batch_number: original.batch_number ? `${original.batch_number}-COPY` : null,
    };

    // Insert duplicate
    const { data, error } = await supabase
      .from('grower_inventory')
      .insert(newProduct)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
