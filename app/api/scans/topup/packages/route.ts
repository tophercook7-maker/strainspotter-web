import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

// Top-up package definitions (LOCKED PRICING - same for all tiers)
export const TOPUP_PACKAGES = {
  // ID scan top-ups
  'id-25': { scans: 25, doctor: 0, amount: 2.99, label: '25 ID Scans' },
  'id-75': { scans: 75, doctor: 0, amount: 7.99, label: '75 ID Scans' },
  'id-200': { scans: 200, doctor: 0, amount: 18.99, label: '200 ID Scans' },
  // Doctor scan top-ups
  'doctor-5': { scans: 0, doctor: 5, amount: 4.99, label: '5 Doctor Scans' },
  'doctor-15': { scans: 0, doctor: 15, amount: 12.99, label: '15 Doctor Scans' },
  'doctor-40': { scans: 0, doctor: 40, amount: 29.99, label: '40 Doctor Scans' },
};

/**
 * GET /api/scans/topup/packages
 * Get available top-up packages (same for all tiers)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return all packages (same for all tiers)
    return NextResponse.json({
      packages: TOPUP_PACKAGES,
      id_scan_packages: {
        'id-25': TOPUP_PACKAGES['id-25'],
        'id-75': TOPUP_PACKAGES['id-75'],
        'id-200': TOPUP_PACKAGES['id-200'],
      },
      doctor_scan_packages: {
        'doctor-5': TOPUP_PACKAGES['doctor-5'],
        'doctor-15': TOPUP_PACKAGES['doctor-15'],
        'doctor-40': TOPUP_PACKAGES['doctor-40'],
      },
    });
  } catch (error) {
    console.error('Error fetching top-up packages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
