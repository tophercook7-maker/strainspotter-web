// lib/observability/rateLimit.ts
//
// Per-user soft rate limit for the AI endpoints. Uses an in-process Map
// of fixed-size sliding windows. Edge runtime lifts each instance
// independently, so this is "best effort" — a determined attacker who
// load-balances across regions could exceed the limit. For tonight's
// abuse profile (one user spamming, or a leaked token), it's the
// right floor.
//
// When we want hard guarantees, swap the impl for an Upstash/Redis
// token bucket. The interface stays the same.

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** Hold at most ~5,000 keys in memory. Beyond that, evict the oldest. */
const MAX_KEYS = 5000;

function evictIfNeeded() {
  if (buckets.size <= MAX_KEYS) return;
  // Cheap eviction: drop the first 200 keys (insertion order).
  let dropped = 0;
  for (const k of buckets.keys()) {
    buckets.delete(k);
    dropped++;
    if (dropped >= 200) break;
  }
}

/**
 * Returns { ok: true } if the request is within the limit, otherwise
 * { ok: false, retryAfterSec } so the caller can return a 429 with a
 * proper Retry-After header.
 */
export function checkRateLimit(
  /** Stable identity key — e.g. user id, or 'ip:'+ip if unauthenticated. */
  key: string,
  /** Max requests per window. */
  limit: number,
  /** Window length in seconds. */
  windowSec: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const b = buckets.get(key);

  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    evictIfNeeded();
    return { ok: true };
  }

  if (b.count < limit) {
    b.count += 1;
    return { ok: true };
  }

  const elapsed = now - b.windowStart;
  const retryAfterSec = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));
  return { ok: false, retryAfterSec };
}
