import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe/config";
import { logger } from "@/lib/observability/log";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

type Membership = "free" | "garden" | "pro";

/**
 * Map a checkout-time priceKey (set by /api/stripe/checkout via metadata)
 * to a Membership value. priceKey is one of "member" | "pro" | "topup_*".
 *
 * Database column 'profiles.membership' is constrained to free | garden |
 * standard | pro | elite. The client AuthProvider collapses garden/standard
 * to "member" — we write 'garden' here to match historical convention.
 */
function membershipFromPriceKey(
  priceKey: string | undefined
): Membership | null {
  if (priceKey === "member") return "garden";
  if (priceKey === "pro") return "pro";
  return null;
}

/**
 * Map a Stripe Price.id to a Membership tier. Used on subscription.updated
 * (upgrades / downgrades / renewals from the customer portal) where there
 * is no metadata.priceKey to lean on.
 */
function membershipFromPriceId(priceId: string | undefined): Membership | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICES.pro) return "pro";
  if (priceId === STRIPE_PRICES.member) return "garden";
  return null;
}

async function findUserByEmail(
  supabase: Awaited<ReturnType<typeof loadAdmin>>,
  email: string
): Promise<{ id: string; email?: string } | null> {
  const listRes = await supabase.auth.admin.listUsers();
  if (listRes.error) {
    return null;
  }
  // TS can't narrow the discriminated union; cast to success-branch shape.
  const users = (
    listRes.data as { users: { id: string; email?: string }[] }
  ).users;
  return (
    users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null
  );
}

async function loadAdmin() {
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  return getSupabaseAdmin();
}

async function updateProfileByEmail(
  email: string,
  updates: Record<string, unknown>,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<boolean> {
  const supabase = await loadAdmin();
  const user = await findUserByEmail(supabase, email);
  if (!user) {
    log.warn("webhook_user_not_found", { req: reqId, email });
    return false;
  }
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (error) {
    log.error("webhook_profile_update_failed", {
      req: reqId,
      email,
      message: error.message,
    });
    return false;
  }
  log.info("webhook_profile_updated", { req: reqId, email, ...updates });
  return true;
}

/**
 * Idempotency check: returns true if we've already successfully processed
 * this Stripe event.id. We use a dedicated table 'stripe_webhook_events'
 * (see migrations/2026_05_07_stripe_webhook_idempotency.sql) keyed by the
 * event_id Stripe assigns to every delivery.
 *
 * Returns true on already-processed (skip), false on first-seen.
 * On any error we conservatively return false and let the handler run —
 * better to risk a rare double-apply than to drop a real event when our
 * idempotency table is unreachable.
 */
async function alreadyProcessed(
  eventId: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<boolean> {
  try {
    const supabase = await loadAdmin();
    const { data, error } = await supabase
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) {
      log.warn("webhook_idempotency_lookup_error", {
        req: reqId,
        eventId,
        message: error.message,
      });
      return false;
    }
    return !!data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("webhook_idempotency_lookup_threw", {
      req: reqId,
      eventId,
      message,
    });
    return false;
  }
}

async function recordProcessed(
  eventId: string,
  eventType: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<void> {
  try {
    const supabase = await loadAdmin();
    const { error } = await supabase
      .from("stripe_webhook_events")
      .insert({ event_id: eventId, event_type: eventType });
    if (error && !/duplicate key/i.test(error.message)) {
      // Duplicate key just means a concurrent delivery already wrote it.
      log.warn("webhook_idempotency_insert_error", {
        req: reqId,
        eventId,
        message: error.message,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("webhook_idempotency_insert_threw", {
      req: reqId,
      eventId,
      message,
    });
  }
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/stripe/webhook" });
  const reqId = log.requestId();
  const t0 = Date.now();

  const { getStripeServerClient } = await import("@/lib/stripe/server");
  const stripe = getStripeServerClient();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  if (webhookSecret) {
    if (!sig) {
      log.warn("webhook_missing_signature", { req: reqId });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      log.error("webhook_sig_verification_failed", { req: reqId, message });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Dev fallback — only used when STRIPE_WEBHOOK_SECRET is unset.
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    log.warn("webhook_unverified_dev_mode", { req: reqId, type: event?.type });
  }

  log.info("webhook_received", {
    req: reqId,
    eventId: event.id,
    type: event.type,
  });

  // Idempotency — Stripe redelivers events under several conditions
  // (network errors on our side, manual replay from the Stripe dashboard,
  // their own at-least-once guarantee). Skip if we've already processed
  // this event.id.
  if (await alreadyProcessed(event.id, log, reqId)) {
    log.info("webhook_idempotent_skip", {
      req: reqId,
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json({ received: true, idempotent: true });
  }

  try {
    switch (event.type) {
      /* ── Checkout completed ── */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const priceKey = session.metadata?.priceKey;
        const customerEmail =
          session.customer_details?.email || session.customer_email;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;

        if (!customerEmail) {
          log.warn("webhook_checkout_no_email", { req: reqId });
          break;
        }

        // Subscription path
        const membership = membershipFromPriceKey(priceKey);
        if (membership) {
          await updateProfileByEmail(
            customerEmail,
            { membership, stripe_customer_id: customerId },
            log,
            reqId
          );
          break;
        }

        // Top-up path
        if (priceKey === "topup_10" || priceKey === "topup_25") {
          const scansToAdd = priceKey === "topup_10" ? 10 : 25;
          const supabase = await loadAdmin();
          const user = await findUserByEmail(supabase, customerEmail);
          if (!user) {
            log.warn("webhook_topup_user_not_found", {
              req: reqId,
              email: customerEmail,
            });
            break;
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("scans_remaining")
            .eq("id", user.id)
            .single();
          const current = profile?.scans_remaining || 0;
          const next = current + scansToAdd;
          await supabase
            .from("profiles")
            .update({
              scans_remaining: next,
              stripe_customer_id: customerId,
            })
            .eq("id", user.id);
          log.info("webhook_topup_applied", {
            req: reqId,
            email: customerEmail,
            scansToAdd,
            scansAfter: next,
          });
          break;
        }

        log.warn("webhook_checkout_unknown_priceKey", {
          req: reqId,
          priceKey,
          email: customerEmail,
        });
        break;
      }

      /* ── Subscription created or updated ── */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId);
        if (
          customer.deleted ||
          !("email" in customer) ||
          !customer.email
        ) {
          break;
        }
        const email = customer.email;

        const isActive =
          sub.status === "active" || sub.status === "trialing";

        if (!isActive) {
          // past_due / unpaid / canceled / incomplete: no upgrade.
          // Stripe will fire subscription.deleted when retries exhaust.
          log.info("webhook_subscription_inactive_status", {
            req: reqId,
            email,
            status: sub.status,
          });
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const membership = membershipFromPriceId(priceId);
        if (!membership) {
          log.warn("webhook_subscription_unknown_price", {
            req: reqId,
            email,
            priceId,
          });
          break;
        }

        await updateProfileByEmail(
          email,
          { membership, stripe_customer_id: customerId },
          log,
          reqId
        );
        break;
      }

      /* ── Subscription cancelled ── */
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId);
        if (
          customer.deleted ||
          !("email" in customer) ||
          !customer.email
        ) {
          break;
        }
        await updateProfileByEmail(
          customer.email,
          { membership: "free" satisfies Membership },
          log,
          reqId
        );
        break;
      }

      /* ── Payment failed ── */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        log.warn("webhook_payment_failed", {
          req: reqId,
          email: invoice.customer_email,
          attempt: invoice.attempt_count,
        });
        // Do not downgrade — Stripe will retry. subscription.deleted fires
        // after final retry exhausts.
        break;
      }

      default:
        log.info("webhook_unhandled_event", { req: reqId, type: event.type });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("webhook_handler_error", {
      req: reqId,
      type: event.type,
      message,
      ms: Date.now() - t0,
    });
    // Return 500 so Stripe retries — better than dropping a real event.
    return NextResponse.json(
      { error: "Webhook handler error", detail: message },
      { status: 500 }
    );
  }

  await recordProcessed(event.id, event.type, log, reqId);
  log.info("webhook_done", {
    req: reqId,
    type: event.type,
    ms: Date.now() - t0,
  });
  return NextResponse.json({ received: true });
}
