// app/api/b2b/directory/route.ts — browse opted-in business profiles.
//
// B2B only: the caller must hold a business profile themselves (consumers get
// 403). Contact fields are never included — they flow only through an
// accepted connection (see /api/b2b/connections).

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBusinessProfile, isB2BRole, DIRECTORY_COLUMNS } from "@/lib/b2b/server";

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  let me;
  try {
    me = await getBusinessProfile(gate.userId);
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
  if (!me) {
    return NextResponse.json(
      { error: "Create a business profile to browse the directory.", code: "no_business_profile" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const q = searchParams.get("q")?.trim().slice(0, 80);

  let query = getSupabaseAdmin()
    .from("business_profiles")
    .select(DIRECTORY_COLUMNS)
    .eq("directory_opt_in", true)
    .neq("id", me.id)
    .order("verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (role && isB2BRole(role)) query = query.eq("role", role);
  if (q) query = query.or(`business_name.ilike.%${q}%,region.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Directory read failed" }, { status: 500 });
  }
  return NextResponse.json({ profiles: data ?? [], myProfileId: me.id });
}
