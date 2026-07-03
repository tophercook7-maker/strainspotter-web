// app/api/b2b/connect/route.ts — send a connection request to another business.
//
// POST { toProfileId, message? }. One directed request per pair (DB unique).
// Rate-limited: connection spam is the main abuse vector.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/observability/rateLimit";
import { getBusinessProfile, cleanText, isUuid } from "@/lib/b2b/server";
import { logger } from "@/lib/observability/log";

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/b2b/connect" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const rl = await checkRateLimit(gate.userId, 10, 3600, "b2b-connect:1h");
  if (rl.ok === false) {
    return NextResponse.json(
      { error: "Too many connection requests — try again later.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isUuid(body.toProfileId)) {
    return NextResponse.json({ error: "toProfileId (uuid) is required" }, { status: 400 });
  }
  const message = cleanText(body.message, 500);

  try {
    const me = await getBusinessProfile(gate.userId);
    if (!me) {
      return NextResponse.json(
        { error: "Create a business profile first.", code: "no_business_profile" },
        { status: 403 }
      );
    }
    if (me.id === body.toProfileId) {
      return NextResponse.json({ error: "You can't connect to yourself." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Target must exist and be discoverable (opted in).
    const { data: target } = await admin
      .from("business_profiles")
      .select("id, directory_opt_in")
      .eq("id", body.toProfileId)
      .maybeSingle();
    if (!target || !target.directory_opt_in) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    // If they already requested US, point the caller at Respond instead.
    const { data: reverse } = await admin
      .from("connection_requests")
      .select("id, status")
      .eq("from_profile", body.toProfileId)
      .eq("to_profile", me.id)
      .maybeSingle();
    if (reverse && (reverse.status === "pending" || reverse.status === "accepted")) {
      return NextResponse.json(
        {
          error:
            reverse.status === "accepted"
              ? "You're already connected."
              : "They already sent you a request — respond to it instead.",
          code: reverse.status === "accepted" ? "already_connected" : "respond_instead",
        },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from("connection_requests")
      .insert({ from_profile: me.id, to_profile: body.toProfileId, message })
      .select("id, status, created_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already sent this business a request.", code: "duplicate" },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    log.info("b2b_connect_sent", { from: me.id, to: body.toProfileId });
    return NextResponse.json({ ok: true, request: data });
  } catch (e) {
    log.error("b2b_connect_error", { user: gate.userId, err: String(e) });
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
