// app/api/iap/webhook/route.ts
//
// RevenueCat webhook → Supabase profiles + scan_credits.
// Mirrors the Stripe webhook in app/api/stripe/webhook/route.ts, but for
// Apple IAP (and eventually Google Play, same shape).
//
// RevenueCat documentation: https://www.revenuecat.com/docs/integrations/webhooks
//
// Events we handle:
//   INITIAL_PURCHASE   — first purchase of a subscription
//   RENEWAL            — auto-renewal succeeded
//   PRODUCT_CHANGE     — upgrade/downgrade between tiers (e.g. member → pro)
//   NON_RENEWING_PURCHASE — one-time products (founder, topups)
//   CANCELLATION       — auto-renewal turned off; entitlement still active
//                        until expires_at, then EXPIRATION fires
//   EXPIRATION         — entitlement actually ended, downgrade to free
//   UNCANCELLATION     — user re-enabled auto-renew before expiry
//   BILLING_ISSUE      — payment failed in retry window; don't downgrade yet
//
// Security:
//   • Verify the Authorization header against REVENUECAT_WEBHOOK_AUTH_SECRET.
//     RevenueCat sends this exactly as you configured it in their dashboard.
//   • Idempotency: every event has an `id` field; we record it in
//     stripe_webhook_events (re-used; rename or split if it bothers you later).

import { NextRequest, NextResponse } from "next/server";
import { APPLE_TO_SKU, APPLE_TOPUP_GRANTS, isTopupProductId } from "@/lib/iap/products";
import { logger } from "@/lib/observability/log";

const RC_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_AUTH_SECRET || "";

import type { Membership } from "@/lib/billing/membership";

/**
 * RevenueCat webhook event envelope (simplified — only the fields we use).
 * Full shape: https://www.revenuecat.com/docs/integrations/webhooks/webhooks-v2
 */
interface RCEventBody {
  api_version: string;
  event: {
    id: string;
    type: string;
    event_timestamp_ms: number;
    app_user_id: string;
    /** Original buyer's app_user_id — same as app_user_id unless aliased. */
    original_app_user_id?: string;
    product_id: string;
    /** RevenueCat entitlement IDs granted by this event. */
    entitlement_ids?: string[] | null;
    /** Apple "expires_date" / Google "expiryTimeMillis" — ms since epoch. */
    expiration_at_ms?: number | null;
    purchased_at_ms?: number;
    /** "APP_STORE" | "PLAY_STORE" | "STRIPE" | "PROMOTIONAL" | ... */
    store: string;
    environment: "SANDBOX" | "PRODUCTION";
    /** Apple transaction id for audit. */
    transaction_id?: string;
    original_transaction_id?: string;
  };
}

/**
 * Map RevenueCat entitlement IDs to our Supabase 'membership' value.
 * Mirrors the Apple-product-key → membership mapping in lib/iap/products.ts.
 *
 * Precedence: founder > pro > member. A user who somehow holds both pro and
 * member shouldn't be downgraded.
 */
function membershipFromEntitlements(
  entitlements: string[] | null | undefined
): Membership | null {
  if (!entitlements || entitlements.length === 0) return null;
  if (entitlements.includes("founder")) return "elite";
  if (entitlements.includes("pro")) return "pro";
  if (entitlements.includes("member")) return "garden";
  return null;
}

async function loadAdmin() {
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  return getSupabaseAdmin();
}

/** Update profile by Supabase user id (the RC app_user_id). */
async function updateProfile(
  userId: string,
  updates: Record<string, unknown>,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<boolean> {
  const supabase = await loadAdmin();

  // Defense-in-depth: when this update tries to bind an
  // apple_original_transaction_id, first check the transaction isn't
  // already claimed by a DIFFERENT user. If it is, refuse the update —
  // a single Apple transaction must map to exactly one Supabase account.
  // The UNIQUE constraint (migration 2026_05_31_iap_transaction_uniqueness)
  // is the authoritative guard; this check is a clearer error path.
  const txnId = updates.apple_original_transaction_id;
  if (typeof txnId === "string" && txnId.length > 0) {
    const existing = await supabase
      .from("profiles")
      .select("id")
      .eq("apple_original_transaction_id", txnId)
      .maybeSingle();
    const owner = (existing.data as { id: string } | null)?.id;
    if (owner && owner !== userId) {
      log.warn("iap_webhook_transaction_collision", {
        req: reqId,
        userId,
        owner,
        apple_original_transaction_id: txnId,
      });
      return false;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) {
    // Postgres unique_violation = '23505'. If we hit it on this path it
    // means a parallel webhook for the same transaction beat us to it —
    // treat as a soft failure, not a 500.
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      log.warn("iap_webhook_transaction_uniqueness_violation", {
        req: reqId,
        userId,
        message: error.message,
      });
      return false;
    }
    log.error("iap_webhook_profile_update_failed", {
      req: reqId,
      userId,
      message: error.message,
    });
    return false;
  }
  log.info("iap_webhook_profile_updated", { req: reqId, userId, ...updates });
  return true;
}

const isDupKey = (m?: string) => !!m && /duplicate key|already exists|23505/i.test(m);
type ClaimResult = "claimed" | "duplicate" | "unrecorded";

/**
 * Atomically CLAIM a RevenueCat event before processing (reuses
 * stripe_webhook_events, key `rc_<eventId>`). The PK insert is the gate, so
 * concurrent redeliveries can't both apply the event (double entitlement /
 * double credit). See the Stripe webhook for the full rationale.
 */
async function claimEvent(
  eventId: string,
  eventType: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<ClaimResult> {
  try {
    const supabase = await loadAdmin();
    const { error } = await supabase.from("stripe_webhook_events").insert({
      event_id: `rc_${eventId}`,
      event_type: `revenuecat.${eventType.toLowerCase()}`,
    });
    if (!error) return "claimed";
    if (isDupKey(error.message)) return "duplicate";
    log.warn("iap_webhook_claim_insert_error", { req: reqId, eventId, message: error.message });
    return "unrecorded";
  } catch (err: unknown) {
    log.warn("iap_webhook_claim_threw", { req: reqId, eventId, message: err instanceof Error ? err.message : String(err) });
    return "unrecorded";
  }
}

/** Release a claim so RevenueCat's retry can reprocess (only on failure). */
async function releaseEvent(
  eventId: string,
  log: ReturnType<typeof logger.child>,
  reqId: string
): Promise<void> {
  try {
    const supabase = await loadAdmin();
    const { error } = await supabase.from("stripe_webhook_events").delete().eq("event_id", `rc_${eventId}`);
    if (error) log.warn("iap_webhook_release_error", { req: reqId, eventId, message: error.message });
  } catch (err: unknown) {
    log.warn("iap_webhook_release_threw", { req: reqId, eventId, message: err instanceof Error ? err.message : String(err) });
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
    const { error } = await supabase.from("stripe_webhook_events").insert({
      event_id: `rc_${eventId}`,
      event_type: `revenuecat.${eventType.toLowerCase()}`,
    });
    if (error && !/duplicate key/i.test(error.message)) {
      log.warn("iap_webhook_idempotency_insert_error", {
        req: reqId,
        eventId,
        message: error.message,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.warn("iap_webhook_idempotency_insert_threw", {
      req: reqId,
      eventId,
      message,
    });
  }
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/iap/webhook" });
  const reqId = log.requestId();
  const t0 = Date.now();

  // 1. Auth — RevenueCat sends the secret as Authorization: Bearer <secret>
  const auth = req.headers.get("authorization");
  if (!RC_WEBHOOK_SECRET) {
    log.error("iap_webhook_secret_missing", { req: reqId });
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }
  if (auth !== `Bearer ${RC_WEBHOOK_SECRET}`) {
    log.warn("iap_webhook_bad_auth", { req: reqId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RCEventBody;
  try {
    body = (await req.json()) as RCEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.event?.id || !body?.event?.type) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const ev = body.event;
  log.info("iap_webhook_received", {
    req: reqId,
    eventId: ev.id,
    type: ev.type,
    store: ev.store,
    env: ev.environment,
    productId: ev.product_id,
    userId: ev.app_user_id,
  });

  // Atomically claim before processing (closes the concurrent-redelivery race).
  const claim = await claimEvent(ev.id, ev.type, log, reqId);
  if (claim === "duplicate") {
    log.info("iap_webhook_idempotent_skip", { req: reqId, eventId: ev.id });
    return NextResponse.json({ received: true, idempotent: true });
  }

  // We allow sandbox events to flow through in non-production so we can
  // test against TestFlight. In production, drop them — they're test data.
  // (Already claimed above, so a redelivery is a no-op.)
  if (ev.environment === "SANDBOX" && process.env.NODE_ENV === "production") {
    log.info("iap_webhook_sandbox_in_production_skipped", {
      req: reqId,
      eventId: ev.id,
    });
    if (claim === "unrecorded") await recordProcessed(ev.id, ev.type, log, reqId);
    return NextResponse.json({ received: true, sandbox_skipped: true });
  }

  try {
    switch (ev.type) {
      /* ── Subscription lifecycle: grant the entitlement ── */
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION": {
        const membership = membershipFromEntitlements(ev.entitlement_ids);
        if (!membership) {
          log.warn("iap_webhook_no_entitlement_match", {
            req: reqId,
            eventId: ev.id,
            entitlements: ev.entitlement_ids,
          });
          break;
        }
        await updateProfile(
          ev.app_user_id,
          {
            membership,
            apple_original_transaction_id: ev.original_transaction_id ?? null,
            apple_current_period_end:
              ev.expiration_at_ms != null
                ? new Date(ev.expiration_at_ms).toISOString()
                : null,
          },
          log,
          reqId
        );
        break;
      }

      /* ── One-time purchases: founder lifetime or scan topups ── */
      case "NON_RENEWING_PURCHASE": {
        const productId = ev.product_id;

        // Founder lifetime → upgrade to elite + mark purchase date
        if (productId.endsWith(".founder.lifetime")) {
          await updateProfile(
            ev.app_user_id,
            {
              membership: "elite" satisfies Membership,
              founder_purchase_at: new Date(
                ev.purchased_at_ms ?? Date.now()
              ).toISOString(),
              apple_original_transaction_id:
                ev.original_transaction_id ?? null,
            },
            log,
            reqId
          );
          break;
        }

        // Scan topup → grant credits without changing membership
        if (isTopupProductId(productId)) {
          const scansToAdd = APPLE_TOPUP_GRANTS[productId] ?? 0;
          if (scansToAdd <= 0) {
            log.warn("iap_webhook_topup_zero_grant", {
              req: reqId,
              productId,
            });
            break;
          }
          const supabase = await loadAdmin();
          const { data: profile } = await supabase
            .from("profiles")
            .select("scans_remaining")
            .eq("id", ev.app_user_id)
            .single();
          const current = profile?.scans_remaining || 0;
          const next = current + scansToAdd;
          const { error } = await supabase
            .from("profiles")
            .update({
              scans_remaining: next,
              apple_original_transaction_id:
                ev.original_transaction_id ?? null,
            })
            .eq("id", ev.app_user_id);
          if (error) {
            log.error("iap_webhook_topup_update_failed", {
              req: reqId,
              userId: ev.app_user_id,
              message: error.message,
            });
          } else {
            log.info("iap_webhook_topup_applied", {
              req: reqId,
              userId: ev.app_user_id,
              productId,
              scansToAdd,
              scansAfter: next,
            });
          }
          break;
        }

        log.warn("iap_webhook_unknown_non_renewing_product", {
          req: reqId,
          productId,
        });
        break;
      }

      /* ── Subscription expired — actually downgrade ── */
      case "EXPIRATION": {
        // RevenueCat sends EXPIRATION when the user's last paid period
        // ran out and no renewal arrived. We downgrade to free.
        await updateProfile(
          ev.app_user_id,
          { membership: "free" satisfies Membership },
          log,
          reqId
        );
        break;
      }

      /* ── User cancelled auto-renew, but is still in paid period ── */
      case "CANCELLATION":
      case "BILLING_ISSUE": {
        // Do NOT downgrade. The user still has access until expires_at.
        // RevenueCat will fire EXPIRATION at that time.
        log.info("iap_webhook_cancel_or_billing_no_downgrade", {
          req: reqId,
          type: ev.type,
          userId: ev.app_user_id,
          expiresAt: ev.expiration_at_ms,
        });
        break;
      }

      /* ── Transfers, refunds, subscription paused, etc. ── */
      case "TRANSFER":
      case "SUBSCRIPTION_PAUSED": {
        log.info("iap_webhook_informational", {
          req: reqId,
          type: ev.type,
          userId: ev.app_user_id,
        });
        break;
      }

      default:
        log.info("iap_webhook_unhandled_event", {
          req: reqId,
          type: ev.type,
        });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("iap_webhook_handler_error", {
      req: reqId,
      type: ev.type,
      message,
      ms: Date.now() - t0,
    });
    // Release the claim so RevenueCat's retry can reprocess.
    if (claim === "claimed") await releaseEvent(ev.id, log, reqId);
    // 500 → RevenueCat retries
    return NextResponse.json(
      { error: "Webhook handler error", detail: message },
      { status: 500 }
    );
  }

  // Backfill only if the claim insert never landed (table was unreachable).
  if (claim === "unrecorded") await recordProcessed(ev.id, ev.type, log, reqId);
  log.info("iap_webhook_done", {
    req: reqId,
    type: ev.type,
    ms: Date.now() - t0,
  });
  return NextResponse.json({ received: true });
}
