import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { findAuthUserByEmail } from "@/lib/supabase/findAuthUserByEmail";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  buildMembershipStripeUpdate,
  incrementTopupScans,
} from "@/lib/stripe/membershipProfileSync";
import { getStripe } from "@/lib/stripe/server";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/* ── Map Stripe price keys → Supabase membership values ── */
function membershipFromPriceKey(
  priceKey: string | undefined
): "garden" | "pro" | null {
  if (priceKey === "member") return "garden";
  if (priceKey === "pro") return "pro";
  return null;
}

async function updateMembershipByUserId(
  userId: string,
  membership: "garden" | "pro" | "free",
  stripeCustomerId: string | null,
  context: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const updates = await buildMembershipStripeUpdate(
    supabase,
    userId,
    membership,
    stripeCustomerId
  );

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id");

  if (error) {
    console.error(
      `[stripe-webhook] ${context}: profile update failed (userId path):`,
      error.message
    );
    return false;
  }
  if (!data?.length) {
    console.warn(
      `[stripe-webhook] ${context}: no profile row for userId — membership not updated`
    );
    return false;
  }

  console.log(
    `[stripe-webhook] ${context}: profile updated via userId path`,
    { membership }
  );
  return true;
}

/* ── Find a user by email and update their profile ── */
async function updateMembershipByEmail(
  email: string,
  membership: "garden" | "pro" | "free",
  stripeCustomerId: string | null,
  context: string
) {
  const supabase = getSupabaseAdmin();

  const { data: userList } = await supabase.auth.admin.listUsers();
  const user = findAuthUserByEmail(userList, email);

  if (!user) {
    console.warn(
      `[stripe-webhook] ${context}: no Supabase auth user for email — profile not updated`
    );
    return false;
  }

  const updates = await buildMembershipStripeUpdate(
    supabase,
    user.id,
    membership,
    stripeCustomerId
  );

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error(
      `[stripe-webhook] ${context}: profile update failed (email path):`,
      error.message
    );
    return false;
  }

  console.log(
    `[stripe-webhook] ${context}: profile updated via email fallback`,
    { membership }
  );
  return true;
}

/* ── Webhook handler ── */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  if (webhookSecret) {
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook sig verification failed:", message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    event = JSON.parse(body);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const priceKey = session.metadata?.priceKey;
      const metadataUserId = session.metadata?.userId?.trim();
      const userId =
        metadataUserId && metadataUserId.length > 0 ? metadataUserId : null;
      const customerEmail =
        session.customer_details?.email || session.customer_email || null;
      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      if (!priceKey) {
        console.warn(
          "[stripe-webhook] checkout.session.completed: missing priceKey in session metadata"
        );
      }

      if (!userId) {
        console.log(
          "[stripe-webhook] checkout.session.completed: userId missing in metadata (will use email fallback if needed)"
        );
      }

      console.log(
        `✅ Checkout completed: priceKey=${priceKey ?? "(none)"} email=${customerEmail ?? "(none)"}`
      );

      const membership = membershipFromPriceKey(priceKey);

      if (membership) {
        if (userId) {
          await updateMembershipByUserId(
            userId,
            membership,
            customerId,
            "checkout.session.completed"
          );
        } else if (customerEmail) {
          console.log(
            "[stripe-webhook] checkout.session.completed: using email fallback for membership sync"
          );
          await updateMembershipByEmail(
            customerEmail,
            membership,
            customerId,
            "checkout.session.completed"
          );
        } else {
          console.warn(
            "[stripe-webhook] checkout.session.completed: cannot sync membership — no userId and no customer email"
          );
        }
      } else if (
        priceKey &&
        priceKey !== "topup_10" &&
        priceKey !== "topup_25"
      ) {
        console.warn(
          "[stripe-webhook] checkout.session.completed: priceKey does not map to membership:",
          priceKey
        );
      }

      if (priceKey === "topup_10" || priceKey === "topup_25") {
        const scansToAdd = priceKey === "topup_10" ? 10 : 25;
        const supabase = getSupabaseAdmin();

        if (userId) {
          const r = await incrementTopupScans(
            supabase,
            userId,
            scansToAdd,
            customerId
          );
          if (!r.ok) {
            console.error("[stripe-webhook] topup (userId):", r.error);
          } else {
            console.log(
              `[stripe-webhook] topup: added ${scansToAdd} topup_scans_available via userId`
            );
          }
        } else if (customerEmail) {
          console.log(
            "[stripe-webhook] topup: userId missing, using email lookup"
          );
          const { data: userList } = await supabase.auth.admin.listUsers();
          const user = findAuthUserByEmail(userList, customerEmail);

          if (!user) {
            console.warn(
              "[stripe-webhook] topup: no auth user matched email — scans not added"
            );
          } else {
            const r = await incrementTopupScans(
              supabase,
              user.id,
              scansToAdd,
              customerId
            );
            if (!r.ok) {
              console.error("[stripe-webhook] topup (email):", r.error);
            } else {
              console.log(
                `[stripe-webhook] topup: added ${scansToAdd} topup_scans_available via email`
              );
            }
          }
        } else {
          console.warn(
            "[stripe-webhook] topup: no userId and no email — scans not added"
          );
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;

      if (!customerId) break;

      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !("email" in customer) || !customer.email) {
        console.warn(
          "[stripe-webhook] subscription.updated: could not resolve customer email"
        );
        break;
      }

      if (sub.status === "active") {
        const priceId = sub.items.data[0]?.price?.id;
        let membership: "garden" | "pro" = "garden";
        if (priceId === "price_1TIckP2LVfewrTUsO0vH5suw") {
          membership = "pro";
        }

        const ok = await updateMembershipByEmail(
          customer.email,
          membership,
          customerId,
          "subscription.updated"
        );
        console.log(
          `[stripe-webhook] subscription.updated: status=active email=${customer.email} membership=${membership} profileUpdated=${ok}`
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : null;

      if (!customerId) break;

      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !("email" in customer) || !customer.email) {
        console.warn(
          "[stripe-webhook] subscription.deleted: could not resolve customer email"
        );
        break;
      }

      const supabase = getSupabaseAdmin();
      const { data: userList } = await supabase.auth.admin.listUsers();
      const user = findAuthUserByEmail(userList, customer.email);
      let ok = false;
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ membership: "free" })
          .eq("id", user.id);
        ok = !error;
        if (error) {
          console.error(
            "[stripe-webhook] subscription.deleted: profile update failed:",
            error.message
          );
        }
      } else {
        console.warn(
          "[stripe-webhook] subscription.deleted: no auth user for email"
        );
      }
      console.log(
        `[stripe-webhook] subscription.deleted: downgrade to free email=${customer.email} profileUpdated=${ok}`
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const email = invoice.customer_email;
      console.log(`[stripe-webhook] invoice.payment_failed: email=${email}`);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
