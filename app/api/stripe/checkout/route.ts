import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe/config";

export async function POST(req: NextRequest) {
  try {
    const { getStripeServerClient } = await import("@/lib/stripe/server");
    const body = await req.json();
    const { priceKey, email, userId, name, moderatorInterest } = body as {
      priceKey: keyof typeof STRIPE_PRICES;
      email?: string;
      userId?: string;
      name?: string;
      moderatorInterest?: boolean;
    };

    const priceId = STRIPE_PRICES[priceKey];
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid price key" },
        { status: 400 }
      );
    }

    // Subscription SKUs are the monthly Member/Pro plans. Top-ups are one-time
    // payments — anything not in this allowlist is treated as one-time.
    const SUBSCRIPTION_PRICE_KEYS = new Set(["member", "pro"]);
    const isSubscription = SUBSCRIPTION_PRICE_KEYS.has(priceKey);
    const origin = req.headers.get("origin") || "https://strainspotter.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/garden/scanner?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/garden/scanner?checkout=cancelled`,
      metadata: {
        priceKey,
        userId: userId || "",
        customerName: name || "",
        moderatorInterest: moderatorInterest ? "yes" : "no",
      },
    };

    // Pre-fill email if we have it
    if (email) {
      sessionParams.customer_email = email;
    }

    // Promo codes on everything — subscriptions AND one-time top-ups.
    // (Also how a $0 end-to-end pipeline test works: 100%-off code on a
    // top-up completes checkout with no card and still fires the webhook.)
    sessionParams.allow_promotion_codes = true;

    const session = await getStripeServerClient().checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
