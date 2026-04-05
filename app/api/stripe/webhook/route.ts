import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/* ── Map Stripe price keys → Supabase membership values ── */
function membershipFromPriceKey(
  priceKey: string | undefined
): "garden" | "pro" | null {
  if (priceKey === "member") return "garden";
  if (priceKey === "pro") return "pro";
  return null;
}

/* ── Find a user by email and update their profile ── */
async function updateProfileByEmail(
  email: string,
  updates: Record<string, unknown>
) {
  const supabase = getSupabaseAdmin();

  // Look up user in auth.users by email
  const { data: userList } = await supabase.auth.admin.listUsers();
  const user = userList?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.log(`⚠️ No Supabase user found for ${email} — will sync on next login`);
    return false;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error(`❌ Profile update failed for ${email}:`, error.message);
    return false;
  }

  console.log(`✅ Profile updated for ${email}:`, updates);
  return true;
}

/* ── Webhook handler ── */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  // If no webhook secret, accept all events (dev mode)
  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook sig verification failed:", message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Dev fallback — parse without verification
    event = JSON.parse(body);
  }

  switch (event.type) {
    /* ── Checkout completed ── */
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const priceKey = session.metadata?.priceKey;
      const customerEmail =
        session.customer_details?.email || session.customer_email;
      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      console.log(
        `✅ Checkout completed: ${priceKey} for ${customerEmail}`
      );

      if (!customerEmail) break;

      // Membership subscription
      const membership = membershipFromPriceKey(priceKey);
      if (membership) {
        await updateProfileByEmail(customerEmail, {
          membership,
          stripe_customer_id: customerId,
        });
      }

      // Scan top-ups
      if (priceKey === "topup_10" || priceKey === "topup_25") {
        const scansToAdd = priceKey === "topup_10" ? 10 : 25;
        const supabase = getSupabaseAdmin();

        const { data: userList } = await supabase.auth.admin.listUsers();
        const user = userList?.users?.find(
          (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
        );

        if (user) {
          // Get current balance then add
          const { data: profile } = await supabase
            .from("profiles")
            .select("scans_remaining")
            .eq("id", user.id)
            .single();

          const current = profile?.scans_remaining || 0;
          await supabase
            .from("profiles")
            .update({
              scans_remaining: current + scansToAdd,
              stripe_customer_id: customerId,
            })
            .eq("id", user.id);

          console.log(
            `📦 Added ${scansToAdd} scans for ${customerEmail} (now ${current + scansToAdd})`
          );
        }
      }
      break;
    }

    /* ── Subscription updated (upgrade/downgrade) ── */
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;

      if (!customerId) break;

      // Get customer email from Stripe
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !("email" in customer) || !customer.email) break;

      if (sub.status === "active") {
        // Figure out the tier from the price
        const priceId = sub.items.data[0]?.price?.id;
        let membership: "garden" | "pro" = "garden";
        // Check if it's the pro price
        if (
          priceId === "price_1TIckP2LVfewrTUsO0vH5suw"
        ) {
          membership = "pro";
        }

        await updateProfileByEmail(customer.email, { membership });
        console.log(
          `🔄 Subscription updated → ${membership} for ${customer.email}`
        );
      }
      break;
    }

    /* ── Subscription cancelled ── */
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;

      if (!customerId) break;

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !("email" in customer) || !customer.email) break;

      await updateProfileByEmail(customer.email, { membership: "free" });
      console.log(`❌ Subscription cancelled → free for ${customer.email}`);
      break;
    }

    /* ── Payment failed ── */
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const email = invoice.customer_email;
      console.log(`⚠️ Payment failed for: ${email}`);
      // Don't downgrade immediately — Stripe retries automatically
      // After all retries fail, subscription.deleted fires
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
