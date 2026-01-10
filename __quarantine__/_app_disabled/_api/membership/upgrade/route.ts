import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getProfile, updateProfile, getDefaultsForMembership } from '@/app/api/_utils/membership';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

import "server-only";
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier } = body; // 'standard' or 'pro' (legacy 'garden' maps to 'standard')

    // Map legacy 'garden' to 'standard'
    const normalizedTier = tier === 'garden' ? 'standard' : tier;

    if (!normalizedTier || !['standard', 'pro'].includes(normalizedTier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "standard" or "pro"' },
        { status: 400 }
      );
    }

    // Get current profile
    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if already at or above this tier
    const tierOrder: Record<string, number> = { free: 0, garden: 1, standard: 1, pro: 2 };
    const currentTier = profile.membership === 'standard' ? 'garden' : profile.membership;
    const targetTier = tier === 'standard' ? 'garden' : tier;
    if ((tierOrder[currentTier] || 0) >= (tierOrder[targetTier] || 0)) {
      return NextResponse.json(
        { error: 'Already at or above this tier' },
        { status: 400 }
      );
    }

    // Get defaults for new tier
    const defaults = getDefaultsForMembership(normalizedTier as 'standard' | 'pro');

    // Update membership and reset quotas
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);

    // Update profile directly via supabaseAdmin since Profile type doesn't include new fields
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const db = supabaseAdmin; // Store in const for TypeScript narrowing
    const { data: updated, error: updateError } = await db
      .from('profiles')
      .update({
        membership: normalizedTier,
        id_scans_used: 0,
        doctor_scans_used: 0,
        quota_reset_at: nextReset.toISOString(),
        scans_remaining: defaults.scans || 0,
        doctor_scans_remaining: defaults.doctor || 0,
        last_reset: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to upgrade membership' },
        { status: 500 }
      );
    }

    // Create transaction record
    const prices = { standard: 9.99, pro: 39.99 };
    const { error: txError } = await db
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'upgrade',
        amount: prices[normalizedTier as 'standard' | 'pro'],
        scans: defaults.scans || 0,
        doctor_scans: defaults.doctor || 0,
        package_name: `upgrade-to-${normalizedTier}`,
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      membership: updated.membership,
      id_scans_used: (updated as any).id_scans_used || 0,
      doctor_scans_used: (updated as any).doctor_scans_used || 0,
      quota_reset_at: (updated as any).quota_reset_at,
      scans_remaining: (updated as any).scans_remaining,
      doctor_scans_remaining: (updated as any).doctor_scans_remaining,
    });
  } catch (error) {
    console.error('Error upgrading membership:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

