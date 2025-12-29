// @ts-nocheck
// ================================================
// EXAMPLE: How to use checkScanGuard in Next.js API routes
// ================================================
import { NextRequest, NextResponse } from 'next/server';
import { checkScanGuard } from '@/lib/scanGuard';
import { supabase } from '@/lib/supabase';

/**
 * Example API route showing scan guard usage
 * This matches the pattern you showed in your query
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, scanType } = body;

    // Validate input
    if (!user?.id) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    if (scanType !== 'local' && scanType !== 'doctor') {
      return NextResponse.json(
        { error: 'Invalid scan type' },
        { status: 400 }
      );
    }

    // Check scan permissions
    const guard = await checkScanGuard(user.id, scanType);

    if (!guard.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: guard.reason,
          upgrade: guard.reason !== 'no_membership',
        },
        { status: 403 }
      );
    }

    // User is allowed to scan - proceed with scan logic
    // ... your scan processing code here ...
    
    // After successful scan, deduct the credit
    // Option 1: Direct call (simpler)
    const { error: deductError } = await supabase.rpc("deduct_scan_credit", {
      uid: user.id,
      scan_kind: scanType,
    });
    
    // Option 2: Using wrapper function (with error handling)
    // const deductResult = await deductScanCredit(user.id, scanType);
    
    if (deductError) {
      // Log error but don't fail the scan - credit was already validated
      console.error('Failed to deduct credit:', deductError);
    }

    return NextResponse.json({
      allowed: true,
      remaining: guard.remaining ? guard.remaining - 1 : 0,
      creditDeducted: !deductError,
      // ... scan results ...
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
