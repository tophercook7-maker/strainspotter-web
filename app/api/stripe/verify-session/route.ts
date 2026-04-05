import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Service role client — bypasses RLS to update profiles
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const priceKey = session.metadata?.priceKey;
    const userId = session.metadata?.userId;
    const tier = priceKey === "pro" ? "pro" : priceKey === "member" ? "garden" : null;
    const email = session.customer_details?.email || session.customer_email || null;
    const name = session.metadata?.customerName || session.customer_details?.name || null;
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;

    // Update Supabase profile if we have a userId
    if (userId && tier) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            membership: tier,
            stripe_customer_id: stripeCustomerId,
            ...(name ? { display_name: name } : {}),
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Profile update error:", updateError.message);
        } else {
          console.log(`✅ Updated profile ${userId} to tier: ${tier}`);
        }
      } catch (e) {
        console.error("Supabase update error:", e);
      }
    }

    // Map DB tier to client tier
    const clientTier = tier === "pro" ? "pro" : tier === "garden" ? "member" : null;

    return NextResponse.json({
      tier: clientTier,
      dbTier: tier,
      email,
      name,
      userId,
      stripeCustomerId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Verify session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
