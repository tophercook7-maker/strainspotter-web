import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
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

    const isSubscription = priceKey === "member" || priceKey === "pro";
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
