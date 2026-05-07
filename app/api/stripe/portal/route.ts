import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { logger } from "@/lib/observability/log";

/**
 * Open a Stripe billing portal session for the AUTHENTICATED user.
 * The customer id is looked up from profiles.stripe_customer_id —
 * the client never gets to choose whose subscription to manage.
 */
export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/stripe/portal" });
  const reqId = log.requestId();

  // Subscription gate verifies token + that they're a paying user. We
  // accept members and pros equally — both have a portal to manage.
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", gate.userId)
      .maybeSingle();

    if (profErr) {
      log.error("portal_profile_lookup_failed", {
        req: reqId,
        message: profErr.message,
      });
      return NextResponse.json(
        { error: "Couldn't load your subscription details." },
        { status: 500 }
      );
    }

    const customerId = profile?.stripe_customer_id;
    if (!customerId || typeof customerId !== "string") {
      log.warn("portal_no_customer_id", { req: reqId, user: gate.userId });
      return NextResponse.json(
        {
          error:
            "Your subscription record is missing a billing customer ID. Contact support.",
          code: "no_customer_id",
        },
        { status: 409 }
      );
    }

    const origin = req.headers.get("origin") || "https://strainspotter.app";

    const { getStripeServerClient } = await import("@/lib/stripe/server");
    const session = await getStripeServerClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/garden/settings`,
    });

    log.info("portal_session_created", { req: reqId, user: gate.userId });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("portal_error", { req: reqId, message });
    return NextResponse.json(
      { error: "Couldn't open the subscription portal." },
      { status: 500 }
    );
  }
}
