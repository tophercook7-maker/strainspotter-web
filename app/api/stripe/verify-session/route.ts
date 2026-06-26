import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const { getStripeServerClient } = await import("@/lib/stripe/server");
    const session = await getStripeServerClient().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    const priceKey = session.metadata?.priceKey;
    const email =
      session.customer_details?.email || session.customer_email || null;
    const name =
      session.metadata?.customerName ||
      session.customer_details?.name ||
      null;
    const customerId =
      typeof session.customer === "string" ? session.customer : null;

    // Map to client tier names
    const tier =
      priceKey === "pro" ? "pro" : priceKey === "member" ? "member" : null;

    // Best-effort: sync to Supabase profile if user exists
    // Generate a magic-link to AUTO-SIGN-IN the buyer and sync their membership.
    // admin.generateLink returns the user (O(1) — no listUsers page-1 scan bug)
    // plus an action_link the success page can redirect to. All non-blocking:
    // the Stripe webhook is the canonical grant, so any failure here just falls
    // back to manual sign-in.
    let signInLink: string | null = null;
    if (email && tier) {
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase/server");
        const supabase = getSupabaseAdmin();
        const origin = req.headers.get("origin") || req.nextUrl.origin;
        const { data, error } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${origin}/garden/scanner?welcome=1` },
        });
        if (!error && data) {
          signInLink = (data.properties as { action_link?: string } | null)?.action_link ?? null;
          const uid = (data.user as { id?: string } | null)?.id;
          if (uid) {
            await supabase
              .from("profiles")
              .update({ membership: tier === "pro" ? "pro" : "garden", stripe_customer_id: customerId })
              .eq("id", uid);
          }
        }
      } catch (e) {
        console.warn("Supabase sync/auto-login in verify-session failed:", e);
      }
    }

    return NextResponse.json({ tier, email, name, signInLink });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Verify session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
