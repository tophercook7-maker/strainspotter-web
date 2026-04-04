import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const priceKey = session.metadata?.priceKey;
      const userId = session.metadata?.userId;
      const customerEmail = session.customer_details?.email || session.customer_email;

      console.log(`✅ Checkout completed: ${priceKey} for ${customerEmail} (user: ${userId})`);

      // TODO: When Supabase auth is wired:
      // 1. For subscriptions: update user profile tier in Supabase
      // 2. For top-ups: add scans to user's scan balance in Supabase
      // 3. Store Stripe customer ID in user profile
      //
      // For now, the client handles gating via localStorage.
      // This webhook logs events so we have a record of all purchases.

      if (priceKey === "topup_10" || priceKey === "topup_25") {
        const scans = priceKey === "topup_10" ? 10 : 25;
        console.log(`📦 Adding ${scans} scans for ${customerEmail}`);
        // TODO: Update Supabase scan balance
      }

      if (priceKey === "member" || priceKey === "pro") {
        console.log(`🎉 New ${priceKey} subscriber: ${customerEmail}`);
        // TODO: Update Supabase profile tier
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`🔄 Subscription updated: ${sub.id}, status: ${sub.status}`);
      // TODO: Sync tier changes to Supabase
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`❌ Subscription cancelled: ${sub.id}`);
      // TODO: Downgrade user to free tier in Supabase
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`⚠️ Payment failed for: ${invoice.customer_email}`);
      // TODO: Send dunning email, possibly downgrade after grace period
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
