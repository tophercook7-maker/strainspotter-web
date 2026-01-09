/**
 * Canary Alerts Evaluation Endpoint
 * Admin-only, triggers canary alert evaluation
 * Fire-and-forget, non-blocking
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { evaluateCanaryAlerts } from '@/app/api/_utils/canaryAlerts';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI(); // Admin-only access

    // Run evaluation asynchronously (fire-and-forget)
    evaluateCanaryAlerts().catch(error => {
      console.warn('[canary-alerts/evaluate] Evaluation failed (non-blocking):', error);
    });

    return NextResponse.json({ 
      message: 'Canary alert evaluation triggered',
      status: 'queued'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === 'Admin access required' ? 403 : 500 }
    );
  }
}

