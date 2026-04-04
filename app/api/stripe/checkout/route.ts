import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceKey, email, userId } = body as {
      priceKey: keyof typeof STRIPE_PRICES;
      email?: string;
      userId?: string;
    };

    const priceId = STRIPE_PRICES[priceKey];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid price key" }, { status: 400 });
    }

    const isSubscription = priceKey === "member" || priceKey === "pro";
    const origin = req.headers.get("origin") || "https://strainspotter.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/garden?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/garden?checkout=cancelled`,
      metadata: {
        priceKey,
        userId: userId || "",
      },
    };

    // Pre-fill email if we have it
    if (email) {
      sessionParams.customer_email = email;
    }

    // For subscriptions, allow promo codes
    if (isSubscription) {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
