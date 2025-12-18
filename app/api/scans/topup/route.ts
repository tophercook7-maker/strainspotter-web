import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getProfile, updateProfile, getDefaultsForMembership, MembershipTier } from '@/app/api/_utils/membership';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

// Top-up package definitions by membership tier
const TOPUP_PACKAGES: Record<string, Record<string, { scans: number; doctor: number; amount: number }>> = {
  free: {
    'regular-25': { scans: 25, doctor: 0, amount: 5.99 },
    'doctor-5': { scans: 0, doctor: 5, amount: 4.99 },
    'doctor-10': { scans: 0, doctor: 10, amount: 8.99 },
  },
  garden: {
    'regular-25': { scans: 25, doctor: 0, amount: 5.99 },
    'regular-50': { scans: 50, doctor: 0, amount: 9.99 },
    'doctor-5': { scans: 0, doctor: 5, amount: 4.99 },
    'doctor-10': { scans: 0, doctor: 10, amount: 8.99 },
  },
  pro: {
    'regular-50': { scans: 50, doctor: 0, amount: 9.99 },
    'regular-100': { scans: 100, doctor: 0, amount: 17.99 },
    'doctor-10': { scans: 0, doctor: 10, amount: 8.99 },
    'doctor-20': { scans: 0, doctor: 20, amount: 14.99 },
  },
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, package: packageName } = body;

    if (!type || !['regular', 'doctor'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "regular" or "doctor"' },
        { status: 400 }
      );
    }

    // Get profile to determine membership tier
    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const membership = profile.membership as MembershipTier;
    const availablePackages = TOPUP_PACKAGES[membership] || TOPUP_PACKAGES.free;

    if (!packageName || !availablePackages[packageName]) {
      return NextResponse.json(
        { error: 'Invalid package name for your membership tier' },
        { status: 400 }
      );
    }

    const packageDetails = availablePackages[packageName];

    // Add scans to profile
    const updated = await updateProfile(user.id, {
      scans_remaining: profile.scans_remaining + packageDetails.scans,
      doctor_scans_remaining: profile.doctor_scans_remaining + packageDetails.doctor,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Create transaction record
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
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
      scans_remaining: updated.scans_remaining,
      doctor_scans_remaining: updated.doctor_scans_remaining,
      package: packageName,
      added_scans: packageDetails.scans,
      added_doctor_scans: packageDetails.doctor,
    });
  } catch (error) {
    console.error('Error processing top-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

