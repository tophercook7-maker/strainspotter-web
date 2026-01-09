import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireGardenMembership } from '@/app/api/_utils/membershipGuard';

import "server-only";
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await requireGardenMembership(req);
  if (!membership.allowed) {
    return membership.response!;
  }

  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const room = searchParams.get('room');
  const search = searchParams.get('search');
  const includeArchived = searchParams.get('archived') === 'true';

  let query = supabase
    .from('plants')
    .select('*')
    .eq('user_id', user.id);

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  if (stage && stage !== 'all') {
    query = query.eq('stage', stage);
  }

  if (room) {
    query = query.ilike('room', `%${room}%`);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,strain_name.ilike.%${search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching plants:', error);
    return NextResponse.json({ error: 'Failed to load plants' }, { status: 500 });
  }

  return NextResponse.json({ plants: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await requireGardenMembership(req);
  if (!membership.allowed) {
    return membership.response!;
  }

  const body = await req.json();
  const {
    name,
    strain_id,
    strain_name,
    stage,
    room,
    medium,
    start_date,
    expected_harvest,
    notes,
    tags,
    health_status,
  } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('plants')
    .insert({
      user_id: user.id,
      name,
      strain_id: strain_id || null,
      strain_name: strain_name || null,
      stage: stage || 'veg',
      room: room || null,
      medium: medium || null,
      start_date: start_date || null,
      expected_harvest: expected_harvest || null,
      notes: notes || null,
      tags: Array.isArray(tags) ? tags : [],
      health_status: health_status || 'healthy',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating plant:', error);
    return NextResponse.json({ error: 'Failed to create plant' }, { status: 500 });
  }

  return NextResponse.json({ plant: data }, { status: 201 });
}

