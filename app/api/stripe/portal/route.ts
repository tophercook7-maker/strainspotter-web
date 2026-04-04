import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId } = body as { customerId: string };

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://strainspotter.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/garden/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Portal session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
