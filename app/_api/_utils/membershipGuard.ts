import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type Tier = 'free' | 'garden' | 'pro';

interface MembershipCheck {
  allowed: boolean;
  tier?: Tier;
  response?: NextResponse;
}

/**
 * Ensure the requester has Garden or Pro membership.
 * Calls the membership check route server-side so all logic stays centralized.
 */
export async function requireGardenMembership(request: NextRequest): Promise<MembershipCheck> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const membershipRes = await fetch(`${origin}/api/membership/check`, {
    method: 'GET',
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!membershipRes.ok) {
    return {
      allowed: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const membership = await membershipRes.json();
  const tier: Tier = membership.membership;

  if (tier === 'free') {
    return {
      allowed: false,
      tier,
      response: NextResponse.json({ error: 'GARDEN_REQUIRED' }, { status: 403 }),
    };
  }

  return { allowed: true, tier };
}

