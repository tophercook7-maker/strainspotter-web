export const runtime = "nodejs";

import "server-only";
// app/api/scan/check/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkScanGuard } from '@/lib/scanGuard';

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return NextResponse.json(
      { ok: false, reason: "runtime-only" },
      { status: 200 }
    );
  }

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();

  // The client will send ?user=<id> OR we will extract from auth later
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user");

  if (!userId) {
    return NextResponse.json(
      { allowed: false, message: "Missing user ID." },
      { status: 400 }
    );
  }

  // Get user membership + credits
  const { data: account, error } = await supabase
    .from("user_accounts")
    .select("id, tier, scan_credits, doctor_credits")
    .eq("id", userId)
    .single();

  if (error || !account) {
    return NextResponse.json(
      { allowed: false, message: "Account not found." },
      { status: 404 }
    );
  }

  // Determine allowance
  const hasCredits =
    (account.scan_credits ?? 0) > 0 ||
    (account.tier === "pro" || account.tier === "ultimate");

  return NextResponse.json({
    allowed: hasCredits,
    tier: account.tier,
    scanCredits: account.scan_credits ?? 0,
    doctorCredits: account.doctor_credits ?? 0,
    message: hasCredits
      ? "Scan permitted."
      : "You're out of credits — please top up or join The Garden.",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, scan_type } = body;

    if (!user_id || !scan_type) {
      return NextResponse.json(
        { error: 'user_id and scan_type are required' },
        { status: 400 }
      );
    }

    if (scan_type !== 'local' && scan_type !== 'doctor') {
      return NextResponse.json(
        { error: 'scan_type must be "local" or "doctor"' },
        { status: 400 }
      );
    }

    const guard = await checkScanGuard(user_id, scan_type);

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

    return NextResponse.json({
      allowed: true,
      remaining: guard.remaining,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
