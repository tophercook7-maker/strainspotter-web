import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { incrementScanUsage, ScanType, checkScanQuota, formatLimitReachedResponse } from '@/app/api/_utils/scanQuota';

/**
 * POST /api/scans/use
 * Atomically check quota and increment usage (authoritative server-side)
 * 
 * DEPRECATED: Use /api/scan/quota/use instead
 * This endpoint is kept for backward compatibility but uses new quota system
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body; // 'regular' or 'doctor' (legacy) -> maps to 'id' or 'doctor'

    if (!type || !['regular', 'doctor'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid scan type. Must be "regular" or "doctor"' },
        { status: 400 }
      );
    }

    // Map legacy 'regular' to 'id'
    const scanType: ScanType = type === 'regular' ? 'id' : 'doctor';

    // Atomically check and increment (authoritative server-side)
    const result = await incrementScanUsage(user.id, scanType);

    if (!result.success) {
      // Get quota status for structured error response
      const quotaCheck = await checkScanQuota(user.id, scanType);
      const limitResponse = formatLimitReachedResponse(quotaCheck, scanType);

      return NextResponse.json(
        {
          ...limitResponse,
          error: 'limit_reached', // Keep for backward compatibility
          message: result.reason === 'quota_exceeded' 
            ? `No ${type} scans remaining` 
            : result.reason === 'not_allowed'
            ? 'Doctor scans are not available for your membership tier.'
            : 'Scan quota check failed',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      id_scans_used: result.id_scans_used,
      doctor_scans_used: result.doctor_scans_used,
      // Legacy fields for backward compatibility
      scans_remaining: result.id_scans_used, // This is actually used, not remaining
      doctor_scans_remaining: result.doctor_scans_used,
    });
  } catch (error: any) {
    console.error('Error using scan:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

