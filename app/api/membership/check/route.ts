import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth';
import { getProfile, shouldResetScans, resetScansToDefaults } from '@/app/api/_utils/membership';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create profile
    let profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if scans should be reset (30 days since last reset)
    const needsReset = shouldResetScans(profile.last_reset);
    
    if (needsReset) {
      // Reset scans to default values for membership tier
      profile = await resetScansToDefaults(user.id, profile.membership);
      if (!profile) {
        return NextResponse.json({ error: 'Failed to reset scans' }, { status: 500 });
      }
    }

    return NextResponse.json({
      membership: profile.membership,
      scans_remaining: profile.scans_remaining,
      doctor_scans_remaining: profile.doctor_scans_remaining,
      should_reset: needsReset,
      last_reset: profile.last_reset,
    });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

