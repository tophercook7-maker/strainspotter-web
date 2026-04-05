import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Service role client — bypasses RLS
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
    const tier = priceKey === "pro" ? "pro" : priceKey === "member" ? "garden" : null;
    const email = session.customer_details?.email || session.customer_email || null;
    const name = session.metadata?.customerName || session.customer_details?.name || null;
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;

    // Map DB tier to client tier
    const clientTier = tier === "pro" ? "pro" : tier === "garden" ? "member" : null;

    return NextResponse.json({
      tier: clientTier,
      dbTier: tier,
      email,
      name,
      stripeCustomerId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Verify session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — called by CheckoutReturn to create account + update profile after payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, email, password, name } = body as {
      sessionId: string;
      email: string;
      password: string;
      name?: string;
    };

    if (!sessionId || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Verify the Stripe session is paid
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not confirmed" }, { status: 400 });
    }

    const priceKey = session.metadata?.priceKey;
    const tier = priceKey === "pro" ? "pro" : priceKey === "member" ? "garden" : "free";
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;

    // 2. Create Supabase user (admin API — skips email confirmation)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm since they just paid
      user_metadata: { display_name: name || "" },
    });

    let userId = newUser?.user?.id || null;

    // If user already exists, look them up
    if (createError && createError.message?.includes("already been registered")) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const found = existingUsers?.users?.find(u => u.email === email);
      userId = found?.id || null;
    } else if (createError) {
      console.error("Create user error:", createError.message);
      // Still return success for the payment part
    }

    // 3. Update profile with tier + stripe info
    if (userId) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          membership: tier,
          stripe_customer_id: stripeCustomerId,
          display_name: name || null,
        }, { onConflict: "id" });

      if (updateError) {
        console.error("Profile upsert error:", updateError.message);
      }
    }

    const clientTier = tier === "pro" ? "pro" : tier === "garden" ? "member" : "free";

    return NextResponse.json({
      success: true,
      userId,
      tier: clientTier,
      dbTier: tier,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Verify-session POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
