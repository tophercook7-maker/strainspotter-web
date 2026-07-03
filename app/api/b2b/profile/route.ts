// app/api/b2b/profile/route.ts — read/upsert the caller's business profile.
//
// POST body: { role, businessName, region?, bio?, licenseNumber?,
//              contactEmail?, contactPhone?, directoryOptIn? }
// `verified` is NEVER accepted from the client — admin-set only.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getBusinessProfile,
  cleanText,
  cleanEmail,
  cleanPhone,
  isB2BRole,
} from "@/lib/b2b/server";
import { logger } from "@/lib/observability/log";

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;
  try {
    const profile = await getBusinessProfile(gate.userId);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/b2b/profile" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isB2BRole(body.role)) {
    return NextResponse.json(
      { error: "role must be one of: grower, lab, dispensary, breeder, processor" },
      { status: 400 }
    );
  }
  const businessName = cleanText(body.businessName, 120);
  if (!businessName) {
    return NextResponse.json({ error: "businessName is required" }, { status: 400 });
  }

  const row = {
    user_id: gate.userId,
    role: body.role,
    business_name: businessName,
    region: cleanText(body.region, 80),
    bio: cleanText(body.bio, 1000),
    license_number: cleanText(body.licenseNumber, 80),
    contact_email: cleanEmail(body.contactEmail),
    contact_phone: cleanPhone(body.contactPhone),
    directory_opt_in: body.directoryOptIn === true,
    // The moderator ask: "help keep our atmosphere clean and healthy."
    // Volunteering is self-serve; ACTIVATION is owner-approved via
    // /api/admin/moderator (which also grants the small scan bonus).
    moderator_volunteer: body.moderatorVolunteer === true,
    // NOTE: no `verified` or `moderator_active` here by design.
  };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("business_profiles")
      .upsert(row, { onConflict: "user_id" })
      .select("id, role, business_name, region, bio, license_number, verified, contact_email, contact_phone, directory_opt_in, moderator_volunteer, moderator_active, created_at")
      .single();
    if (error) throw new Error(error.message);
    log.info("b2b_profile_upsert", { user: gate.userId, role: body.role });
    return NextResponse.json({ ok: true, profile: data });
  } catch (e) {
    log.error("b2b_profile_error", { user: gate.userId, err: String(e) });
    return NextResponse.json({ error: "Failed to save business profile" }, { status: 500 });
  }
}
