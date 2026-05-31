// lib/observability/idempotency.ts
//
// Persistent idempotency cache backed by Supabase.
//
// Previous implementation used an in-process Map: only protected a
// single isolate, so a request that retried across regions would
// double-bill OpenAI. The DB-backed version dedupes at the project
// level: any second request with the same (userId, requestId) within
// the TTL returns the cached result.
//
// Race semantics: we use INSERT … ON CONFLICT to claim a key. The
// claimant runs the work and writes the result. Late awaiters poll
// briefly and return the result when it lands. If the original errors,
// the row is deleted so subsequent requests can retry cleanly.

import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Read-side TTL — a cached result older than this is ignored. */
const TTL_SEC = 60;

/** How long a late awaiter polls before giving up and running fn itself. */
const POLL_BUDGET_MS = 6_000;
const POLL_INTERVAL_MS = 200;

interface IdemRow {
  result: unknown | null;
  created_at: string;
}

/**
 * Run a request idempotently keyed by (userId, requestId).
 *
 * - If no entry exists for the key, claim it, run `fn`, write the result.
 * - If an in-flight entry exists (claimed but no result yet), poll briefly.
 * - If a completed entry exists within TTL, return the cached result.
 * - If `requestId` is omitted, skip dedup entirely (caller pays for retries).
 */
export async function runIdempotent<T>(
  userId: string,
  requestId: string | undefined,
  fn: () => Promise<T>
): Promise<{ result: T; cached: boolean }> {
  if (!requestId) {
    const result = await fn();
    return { result, cached: false };
  }

  const key = `${userId}:${requestId}`;
  const sb = getSupabaseAdmin();
  const ttlCutoff = new Date(Date.now() - TTL_SEC * 1000).toISOString();

  // Try to read an existing cached result first (fast path for repeat taps).
  const existing = await sb
    .from("scan_idempotency")
    .select("result, created_at")
    .eq("key", key)
    .gte("created_at", ttlCutoff)
    .maybeSingle();

  if (existing.data) {
    const row = existing.data as IdemRow;
    if (row.result != null) {
      return { result: row.result as T, cached: true };
    }
    // Row exists but no result yet → another request is in-flight. Poll.
    return await pollForResult<T>(sb, key);
  }

  // Try to atomically claim the key. ON CONFLICT (key) DO NOTHING ensures
  // only one caller proceeds to run fn(); the rest poll.
  const claim = await sb
    .from("scan_idempotency")
    .insert({ key, user_id: userId, result: null })
    .select("created_at")
    .maybeSingle();

  if (claim.error || !claim.data) {
    // Either someone else claimed it (unique violation) or we hit a DB
    // error. Either way, fall through to polling — if no result lands,
    // we run fn anyway (acceptable: very rare path).
    return await pollForResult<T>(sb, key, fn);
  }

  // We own the key. Run fn(); persist result; return.
  try {
    const result = await fn();
    await sb
      .from("scan_idempotency")
      .update({ result: result as unknown as object })
      .eq("key", key);
    return { result, cached: false };
  } catch (err) {
    // Free the slot so the user can retry cleanly.
    await sb.from("scan_idempotency").delete().eq("key", key);
    throw err;
  }
}

/**
 * Poll for a result that another request is producing. If the poll budget
 * elapses without a result, fall back to running `fn` directly (rare race
 * tail). Returns `cached: true` when the poll succeeded.
 */
async function pollForResult<T>(
  sb: ReturnType<typeof getSupabaseAdmin>,
  key: string,
  fallbackFn?: () => Promise<T>
): Promise<{ result: T; cached: boolean }> {
  const deadline = Date.now() + POLL_BUDGET_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const r = await sb
      .from("scan_idempotency")
      .select("result")
      .eq("key", key)
      .maybeSingle();
    const row = r.data as { result: unknown | null } | null;
    if (row?.result != null) {
      return { result: row.result as T, cached: true };
    }
  }
  // Poll budget exhausted. Run fn ourselves if we have one.
  if (fallbackFn) {
    const result = await fallbackFn();
    return { result, cached: false };
  }
  throw new Error("Idempotency poll timed out without result.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
