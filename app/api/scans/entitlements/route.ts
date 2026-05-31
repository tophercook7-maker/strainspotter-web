import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildScanEntitlements } from "@/lib/scanner/scanEntitlements";

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function profileRowToInput(row: Record<string, unknown>) {
  return {
    membership: row.membership as string | null | undefined,
    freeScansUsed: Number(row.free_scans_used ?? 0),
    memberScansUsed: Number(row.member_scans_used ?? 0),
    topupScansAvailable: Number(row.topup_scans_available ?? 0),
    scanPeriodStartedAt: row.scan_period_started_at as string | null | undefined,
    scanPeriodEndsAt: row.scan_period_ends_at as string | null | undefined,
  };
}

/** GET /api/scans/entitlements — current user's scan entitlements (read-only). */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error?.code === "PGRST116" || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entitlements = buildScanEntitlements(profileRowToInput(profile));

    return NextResponse.json({
      ok: true,
      entitlements,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
