// /app/api/inventory/[id]/update/route.ts

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

    // Create Supabase client
    const supabase = await createSupabaseServer();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update inventory item (only if user owns it)
    const { data, error } = await supabase
      .from('grower_inventory')
      .update({
        name: body.name,
        strain_slug: body.strain_slug || null,
        category: body.category || null,
        batch_number: body.batch_number || null,
        barcode: body.barcode || null,
        thc: body.thc || null,
        cbd: body.cbd || null,
        weight_grams: body.weight_grams || null,
        units_available: body.units_available || null,
        price: body.price || null,
        images: body.images || [],
        status: body.status || 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('grower_id', user.id) // Ensure user owns this item
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found or you do not have permission to update it' },
        { status: 404 }
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
