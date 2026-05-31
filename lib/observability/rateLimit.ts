// lib/observability/rateLimit.ts
//
// Persistent per-key rate limiter backed by Supabase.
//
// Previous implementation used an in-process Map; that only protects a
// single Edge isolate at a time and is bypassed across Vercel regions
// and across cold starts. With OpenAI cost per scan running ~$0.01-0.03,
// every leaked bucket directly burns dollars. The DB-backed version
// uses the public.check_rate_limit() RPC for an atomic check-and-
// increment that is correct under any concurrency, anywhere.
//
// One database round-trip (~30-80ms on the same region as Supabase).
// Worth the cost vs. unbounded OpenAI burn.

import { getSupabaseAdmin } from "@/lib/supabase/server";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Atomic check-and-increment for fixed-window rate limits.
 *
 * @param key         Stable identity key (user id, or 'ip:'+ip when unauthed).
 * @param limit       Max requests allowed within `windowSec`.
 * @param windowSec   Window length in seconds.
 * @param scope       Optional namespace, e.g. 'scan:1m', 'scan:1d_pro'.
 *                    Keeping the per-minute, per-day, and per-month
 *                    buckets in distinct scopes prevents cross-window
 *                    interference.
 *
 * On any DB error we fail OPEN — better to let a request through than
 * to wall off all traffic when the rate-limit table is briefly unhappy.
 * The downstream auth gate + consume_scan() RPC are still authoritative,
 * so failing open here doesn't grant free scans.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
  scope = "default"
): Promise<RateLimitResult> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("check_rate_limit", {
      p_scope: scope,
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSec,
    });

    if (error) {
      // Telemetry-only — fail open so a momentary DB hiccup doesn't
      // 503 every signed-in user. consume_scan() is still authoritative
      // for the quota; this layer just smooths bursts.
      console.warn("[rateLimit] check failed, allowing:", error.message);
      return { ok: true };
    }

    const result = data as { ok: boolean; retry_after_sec?: number } | null;
    if (!result || result.ok === true) return { ok: true };
    return {
      ok: false,
      retryAfterSec: Math.max(1, result.retry_after_sec ?? 60),
    };
  } catch (err) {
    console.warn(
      "[rateLimit] unexpected error, allowing:",
      err instanceof Error ? err.message : String(err)
    );
    return { ok: true };
  }
}
