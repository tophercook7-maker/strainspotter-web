import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe/config";
import { isFounderSoldOut } from "@/lib/billing/founder";

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

    // Enforce the Founder "first 1,000" cap at purchase time (live count, not
    // the cached counter). Fail CLOSED on error so a transient DB hiccup can't
    // let us oversell the scarcity promise.
    if (priceKey === "founder_lifetime") {
      try {
        if (await isFounderSoldOut()) {
          return NextResponse.json({ error: "The Founder edition is sold out." }, { status: 409 });
        }
      } catch {
        return NextResponse.json(
          { error: "Couldn't verify Founder availability — please try again." },
          { status: 503 }
        );
      }
    }

    // Subscription SKUs (monthly and annual). Founder lifetime + topups are
    // one-time payments. Treat anything that's not in the subscription
    // allowlist as a one-time payment.
    const SUBSCRIPTION_PRICE_KEYS = new Set([
      "member",
      "member_annual",
      "pro",
      "pro_annual",
    ]);
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

    // For subscriptions, allow promo codes
    if (isSubscription) {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await getStripeServerClient().checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
