import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

// Top-up package definitions (LOCKED PRICING - same for all tiers)
import "server-only";
const TOPUP_PACKAGES: Record<string, { scans: number; doctor: number; amount: number }> = {
  // ID scan top-ups
  'id-25': { scans: 25, doctor: 0, amount: 2.99 },
  'id-75': { scans: 75, doctor: 0, amount: 7.99 },
  'id-200': { scans: 200, doctor: 0, amount: 18.99 },
  // Doctor scan top-ups
  'doctor-5': { scans: 0, doctor: 5, amount: 4.99 },
  'doctor-15': { scans: 0, doctor: 15, amount: 12.99 },
  'doctor-40': { scans: 0, doctor: 40, amount: 29.99 },
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { package: packageName } = body;

    if (!packageName || !TOPUP_PACKAGES[packageName]) {
      return NextResponse.json(
        { error: 'Invalid package name' },
        { status: 400 }
      );
    }

    const packageDetails = TOPUP_PACKAGES[packageName];

    // Get profile
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id_scan_topups_remaining, doctor_scan_topups_remaining')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Add top-ups to profile (top-ups stack cumulatively and don't expire)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        id_scan_topups_remaining: (profile.id_scan_topups_remaining || 0) + packageDetails.scans,
        doctor_scan_topups_remaining: (profile.doctor_scan_topups_remaining || 0) + packageDetails.doctor,
        updated_at: new Date().toISOString(),
      })
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .select('id_scan_topups_remaining, doctor_scan_topups_remaining')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Create transaction record
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'topup',
        amount: packageDetails.amount,
        scans: packageDetails.scans,
        doctor_scans: packageDetails.doctor,
        package_name: packageName,
      });

    if (txError) {
      console.error('Error creating transaction:', txError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      id_scan_topups_remaining: updated.id_scan_topups_remaining,
      doctor_scan_topups_remaining: updated.doctor_scan_topups_remaining,
      package: packageName,
      added_id_scans: packageDetails.scans,
      added_doctor_scans: packageDetails.doctor,
      amount: packageDetails.amount,
    });
  } catch (error) {
    console.error('Error processing top-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

