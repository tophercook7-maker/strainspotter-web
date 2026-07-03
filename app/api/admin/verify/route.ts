// app/api/admin/verify/route.ts — owner sets/unsets the Verified badge.
// POST { profileId, verified: boolean }

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/b2b/server";
import { logger } from "@/lib/observability/log";

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/admin/verify" });
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isUuid(body.profileId) || typeof body.verified !== "boolean") {
    return NextResponse.json(
      { error: "profileId (uuid) and verified (boolean) are required" },
      { status: 400 }
    );
  }

  const { error } = await getSupabaseAdmin()
    .from("business_profiles")
    .update({ verified: body.verified })
    .eq("id", body.profileId);
  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  log.info("admin_verify", { profile: body.profileId, verified: body.verified });
  return NextResponse.json({ ok: true });
}
