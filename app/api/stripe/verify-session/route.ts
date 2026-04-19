import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { findAuthUserByEmail } from "@/lib/supabase/findAuthUserByEmail";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

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
    if (email && tier) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: userList } = await supabase.auth.admin.listUsers();
        const user = findAuthUserByEmail(userList, email);

        if (user) {
          const membership = tier === "pro" ? "pro" : "garden";
          await supabase
            .from("profiles")
            .update({
              membership,
              stripe_customer_id: customerId,
            })
            .eq("id", user.id);
        }
      } catch (e) {
        // Non-blocking — localStorage handles the client side
        console.warn("Supabase sync in verify-session failed:", e);
      }
    }

    return NextResponse.json({ tier, email, name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Verify session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
