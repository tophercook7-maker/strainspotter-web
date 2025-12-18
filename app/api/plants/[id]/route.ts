import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireGardenMembership } from '@/app/api/_utils/membershipGuard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await requireGardenMembership(req);
  if (!membership.allowed) {
    return membership.response!;
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Plant not found' }, { status: 404 });
  }

  return NextResponse.json({ plant: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await requireGardenMembership(req);
  if (!membership.allowed) {
    return membership.response!;
  }

  const { id } = await params;
  const updates = await req.json();

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('plants')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating plant:', error);
    return NextResponse.json({ error: 'Failed to update plant' }, { status: 500 });
  }

  return NextResponse.json({ plant: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await requireGardenMembership(req);
  if (!membership.allowed) {
    return membership.response!;
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from('plants')
    .update({
      is_archived: true,
      stage: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('Error archiving plant:', error);
    return NextResponse.json({ error: 'Failed to archive plant' }, { status: 500 });
  }

  return NextResponse.json({ success: true, plant: data });
}

