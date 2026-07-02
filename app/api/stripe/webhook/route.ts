import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { STRIPE_PRICES, SCAN_CREDIT_GRANTS } from "@/lib/stripe/config";
import { logger } from "@/lib/observability/log";
import type { Membership } from "@/lib/billing/membership";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Map a checkout-time priceKey (set by /api/stripe/checkout via metadata)
 * to a Membership value. priceKey is one of:
 *   "member" | "pro" | "topup_10" | "topup_20" | "topup_50"
 *
 * Database column 'profiles.membership' is constrained to free | garden |
 * standard | pro | elite. The client AuthProvider collapses garden/standard
 * to "member" — we write 'garden' here to match historical convention.
 *
 * (Annual plans and the Founder Lifetime SKU were discontinued Jun 2026.
 * Existing Founder customers keep 'elite' via membership resolution / IAP
 * restore; we just no longer sell those SKUs.)
 */
export function membershipFromPriceKey(
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
export function membershipFromPriceId(priceId: string | undefined): Membership | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICES.pro) return "pro";
  if (priceId === STRIPE_PRICES.member) return "garden";
  return null;
}

/** True if the priceKey is a top-up SKU (one-time scan credit grant). */
export function isTopupPriceKey(
  priceKey: string | undefined
): priceKey is "topup_10" | "topup_20" | "topup_50" {
  return (
    priceKey === "topup_10" ||
    priceKey === "topup_20" ||
    priceKey === "topup_50"
  );
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

/**
 * Resolve a Stripe webhook event to a Supabase user id.
 *
 * Prefers the userId we set in metadata.userId at checkout creation (stable,
 * can't be spoofed by changing the email mid-checkout). Falls back to
 * email-based lookup for legacy sessions or webhooks where metadata is
 * absent. The fallback also catches "user pasted their friend's email"
 * cases but those are still resolved to the matching Supabase user — if
 * the email is unknown, we refuse the upgrade.
 *
 * Returns the user, plus a flag indicating which path succeeded (for
 * telemetry and to optionally verify email matches when known).
 */
async function resolveStripeUser(
  supabase: Awaited<ReturnType<typeof loadAdmin>>,
  metadataUserId: string | undefined,
  fallbackEmail: string | undefined
): Promise<
  | { ok: true; user: { id: string; email?: string }; via: "metadata" | "email" }
  | { ok: false; reason: "no_userid_no_email" | "metadata_user_missing" | "email_user_missing" }
> {
  if (metadataUserId) {
    const { data: u, error } = await supabase.auth.admin.getUserById(
      metadataUserId
    );
    if (!error && u?.user) {
      return {
        ok: true,
        user: { id: u.user.id, email: u.user.email ?? undefined },
        via: "metadata",
      };
    }
    // metadata.userId pointed at a deleted/invalid user — fall through to
    // email lookup if we have one.
  }
  if (fallbackEmail) {
    const user = await findUserByEmail(supabase, fallbackEmail);
    if (user) return { ok: true, user, via: "email" };
    return { ok: false, reason: "email_user_missing" };
  }
  if (metadataUserId) return { ok: false, reason: "metadata_user_missing" };
  return { ok: false, reason: "no_userid_no_email" };
}

/**
 * Look up a Supabase user id by the stripe_customer_id we recorded at
 * checkout time. This is the stable identity link for portal-triggered
 * subscription updates / deletes (where the only thing Stripe gives us
 * is the customer id, and the email can have been changed in the portal).
 */
async function findUserByStripeCustomerId(
  supabase: Awaited<ReturnType<typeof loadAdmin>>,
  customerId: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) {
    log.warn("webhook_stripe_customer_lookup_error", {
      req: reqId,
      customerId,
      message: error.message,
    });
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
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

/** Recognize a Postgres unique-violation (23505) / duplicate-key error. */
export function isDuplicateKeyError(message: string | undefined): boolean {
  return !!message && /duplicate key|already exists|23505/i.test(message);
}

type ClaimResult = "claimed" | "duplicate" | "unrecorded";

/**
 * Atomically CLAIM a Stripe event before processing it. event_id is the PK of
 * stripe_webhook_events, so the INSERT itself is the idempotency gate: of N
 * concurrent redeliveries of the same event.id, exactly one INSERT wins and the
 * rest get a duplicate-key error.
 *
 * This replaces the old check-at-start / record-at-end pattern, which had a
 * TOCTOU race: two concurrent deliveries could both pass the SELECT before
 * either recorded, and both apply the event (e.g. double top-up credits).
 *
 *   "claimed"    → we own it; process. The row is already recorded.
 *   "duplicate"  → another delivery owns/processed it; skip.
 *   "unrecorded" → idempotency table unreachable. Fail OPEN (process anyway so
 *                  we never drop a real paid event), then best-effort record.
 */
async function claimEvent(
  eventId: string,
  eventType: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<ClaimResult> {
  try {
    const supabase = await loadAdmin();
    const { error } = await supabase
      .from("stripe_webhook_events")
      .insert({ event_id: eventId, event_type: eventType });
    if (!error) return "claimed";
    if (isDuplicateKeyError(error.message)) return "duplicate";
    log.warn("webhook_claim_insert_error", {
      req: reqId,
      eventId,
      message: error.message,
    });
    return "unrecorded";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("webhook_claim_threw", { req: reqId, eventId, message });
    return "unrecorded";
  }
}

/**
 * Release a claim so Stripe's next retry can reprocess. Called only when
 * processing THREW after we claimed — otherwise a failed event would stay
 * marked "processed" forever and never apply.
 */
async function releaseEvent(
  eventId: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<void> {
  try {
    const supabase = await loadAdmin();
    const { error } = await supabase
      .from("stripe_webhook_events")
      .delete()
      .eq("event_id", eventId);
    if (error) {
      log.warn("webhook_release_error", { req: reqId, eventId, message: error.message });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("webhook_release_threw", { req: reqId, eventId, message });
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
    // No STRIPE_WEBHOOK_SECRET configured. In production this is a
    // CRITICAL misconfiguration: without signature verification, anyone
    // who learns the endpoint URL can POST a forged
    // checkout.session.completed event and self-grant any tier. Refuse
    // to serve until the env var is set.
    if (process.env.NODE_ENV === "production") {
      log.error("webhook_secret_missing_in_production", { req: reqId });
      return NextResponse.json(
        { error: "Webhook misconfigured" },
        { status: 503 }
      );
    }
    // Dev / preview only: accept unsigned events so local Stripe-CLI
    // forwarding works without a secret. Loud warning so this can't
    // silently leak into prod.
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

  // Idempotency — Stripe redelivers events (retries on our errors, manual
  // dashboard replay, their at-least-once guarantee), sometimes concurrently.
  // CLAIM the event atomically before processing: the PK insert lets exactly
  // one delivery win. A duplicate means someone else owns it → skip.
  const claim = await claimEvent(event.id, event.type, log, reqId);
  if (claim === "duplicate") {
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
        const metadataUserId = session.metadata?.userId || undefined;
        const customerEmail =
          session.customer_details?.email ||
          session.customer_email ||
          undefined;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;

        // Resolve the Supabase user. Prefer metadata.userId (stable across
        // email changes at checkout); fall back to email lookup for legacy
        // sessions. Refuse to grant entitlements if neither resolves.
        const supabase = await loadAdmin();
        const resolved = await resolveStripeUser(
          supabase,
          metadataUserId,
          customerEmail
        );
        if (resolved.ok === false) {
          log.warn("webhook_checkout_user_unresolved", {
            req: reqId,
            reason: resolved.reason,
            hasMetadataUserId: !!metadataUserId,
            hasEmail: !!customerEmail,
          });
          break;
        }
        const userId = resolved.user.id;
        log.info("webhook_checkout_user_resolved", {
          req: reqId,
          userId,
          via: resolved.via,
          priceKey,
        });

        // Subscription / lifetime path (upgrades membership tier)
        const membership = membershipFromPriceKey(priceKey);
        if (membership) {
          const updates: Record<string, unknown> = {
            membership,
            stripe_customer_id: customerId,
          };
          const { error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId);
          if (error) {
            log.error("webhook_profile_update_failed", {
              req: reqId,
              userId,
              message: error.message,
            });
          } else {
            log.info("webhook_membership_upgraded", {
              req: reqId,
              userId,
              membership,
              priceKey,
            });
          }
          break;
        }

        // Top-up path (grants scan credits without changing membership)
        if (isTopupPriceKey(priceKey)) {
          const scansToAdd = SCAN_CREDIT_GRANTS[priceKey] ?? 0;
          if (scansToAdd <= 0) {
            log.warn("webhook_topup_zero_grant", {
              req: reqId,
              priceKey,
              userId,
            });
            break;
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("scans_remaining")
            .eq("id", userId)
            .single();
          const current = profile?.scans_remaining || 0;
          const next = current + scansToAdd;
          await supabase
            .from("profiles")
            .update({
              scans_remaining: next,
              stripe_customer_id: customerId,
            })
            .eq("id", userId);
          log.info("webhook_topup_applied", {
            req: reqId,
            userId,
            priceKey,
            scansToAdd,
            scansAfter: next,
          });
          break;
        }

        log.warn("webhook_checkout_unknown_priceKey", {
          req: reqId,
          priceKey,
          userId,
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

        // Resolve the user by stripe_customer_id (saved at checkout).
        // This is the only stable link Stripe provides for portal-triggered
        // updates — emails can change in the portal and would otherwise
        // re-route entitlements to a different Supabase account.
        const supabase = await loadAdmin();
        const userId = await findUserByStripeCustomerId(
          supabase,
          customerId,
          log,
          reqId
        );
        if (!userId) {
          // Fall back to email-from-Stripe-customer for accounts that
          // pre-date the stripe_customer_id linkage.
          const customer = await stripe.customers.retrieve(customerId);
          if (
            customer.deleted ||
            !("email" in customer) ||
            !customer.email
          ) {
            log.warn("webhook_subscription_no_user_no_email", {
              req: reqId,
              customerId,
            });
            break;
          }
          const fallback = await findUserByEmail(supabase, customer.email);
          if (!fallback) {
            log.warn("webhook_subscription_email_user_not_found", {
              req: reqId,
              customerId,
              email: customer.email,
            });
            break;
          }
          // Backfill the link so next time we hit the fast path.
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", fallback.id);
        }
        const resolvedUserId =
          userId ??
          (await findUserByStripeCustomerId(supabase, customerId, log, reqId));
        if (!resolvedUserId) break;

        const isActive =
          sub.status === "active" || sub.status === "trialing";

        if (!isActive) {
          // past_due / unpaid / canceled / incomplete: no upgrade.
          // Stripe will fire subscription.deleted when retries exhaust.
          log.info("webhook_subscription_inactive_status", {
            req: reqId,
            userId: resolvedUserId,
            status: sub.status,
          });
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const membership = membershipFromPriceId(priceId);
        if (!membership) {
          log.warn("webhook_subscription_unknown_price", {
            req: reqId,
            userId: resolvedUserId,
            priceId,
          });
          break;
        }

        await supabase
          .from("profiles")
          .update({ membership, stripe_customer_id: customerId })
          .eq("id", resolvedUserId);
        log.info("webhook_subscription_updated", {
          req: reqId,
          userId: resolvedUserId,
          membership,
        });
        break;
      }

      /* ── Subscription cancelled ── */
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const supabase = await loadAdmin();
        const userId = await findUserByStripeCustomerId(
          supabase,
          customerId,
          log,
          reqId
        );
        if (!userId) {
          // Fallback: email lookup. Don't backfill here — the user has
          // cancelled, no need to optimize for a "next time."
          const customer = await stripe.customers.retrieve(customerId);
          if (
            customer.deleted ||
            !("email" in customer) ||
            !customer.email
          ) {
            log.warn("webhook_subscription_delete_no_user", {
              req: reqId,
              customerId,
            });
            break;
          }
          const fallback = await findUserByEmail(supabase, customer.email);
          if (!fallback) break;
          await supabase
            .from("profiles")
            .update({ membership: "free" satisfies Membership })
            .eq("id", fallback.id);
          break;
        }
        await supabase
          .from("profiles")
          .update({ membership: "free" satisfies Membership })
          .eq("id", userId);
        log.info("webhook_subscription_deleted_downgraded", {
          req: reqId,
          userId,
        });
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
    // Processing failed after we claimed the event — release the claim so
    // Stripe's retry can reprocess it (otherwise it'd be marked done forever).
    if (claim === "claimed") await releaseEvent(event.id, log, reqId);
    // Return 500 so Stripe retries — better than dropping a real event.
    return NextResponse.json(
      { error: "Webhook handler error", detail: message },
      { status: 500 }
    );
  }

  // If the table was unreachable at claim time we processed fail-open and never
  // recorded — best-effort backfill now so a later redelivery is idempotent.
  if (claim === "unrecorded") await recordProcessed(event.id, event.type, log, reqId);
  log.info("webhook_done", {
    req: reqId,
    type: event.type,
    ms: Date.now() - t0,
  });
  return NextResponse.json({ received: true });
}
