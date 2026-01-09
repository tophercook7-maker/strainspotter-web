import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

import "server-only";
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Billing portal URL (configurable via env var)
    const billingUrl = process.env.NEXT_PUBLIC_BILLING_PORTAL_URL || 'https://billing.strainspotter.com';
    
    return NextResponse.json({
      url: billingUrl,
      message: 'Billing portal integration coming soon',
    });
  } catch (error) {
    console.error('Error getting billing portal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

