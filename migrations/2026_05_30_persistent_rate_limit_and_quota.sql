-- 2026_05_30_persistent_rate_limit_and_quota.sql
--
-- CRITICAL SECURITY FIX: persistent rate-limiting, idempotency, and atomic
-- scan-quota accounting. Replaces the in-memory Maps in
-- lib/observability/{rateLimit,idempotency}.ts, which only protected a
-- single Edge isolate at a time — trivially bypassed across regions and
-- across cold starts, leaving OpenAI cost effectively uncapped.
--
-- New surfaces:
--   • scan_rate_limits   — fixed-window per-key counters (60s, 1d, 1mo, etc.)
--   • scan_idempotency   — short-lived dedup of (user, requestId) → result
--   • check_rate_limit() — atomic check+increment; returns retry_after_sec on miss
--   • consume_scan()     — atomic quota check + counter increment; spends
--                          monthly allowance first, then topup credits.
--
-- All three new objects are intended for use ONLY by service-role callers
-- (the API routes use getSupabaseAdmin()). RLS denies anon/authenticated.
--
-- Idempotent. Safe to re-run.

BEGIN;

/* ─── 1. scan_rate_limits ──────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.scan_rate_limits (
  scope             text        NOT NULL,
  key               text        NOT NULL,
  window_starts_at  timestamptz NOT NULL,
  count             integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);

CREATE INDEX IF NOT EXISTS idx_scan_rate_limits_window
  ON public.scan_rate_limits (window_starts_at);

ALTER TABLE public.scan_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies → no anon/authenticated access. Service role bypasses RLS.

COMMENT ON TABLE public.scan_rate_limits IS
  'Fixed-window rate-limit counters. Keyed by (scope, key). ' ||
  'Scope examples: scan:1m, scan:1d_pro, scan:1mo_pro. ' ||
  'Cleaned up by check_rate_limit() on every call (lazy).';

/* ─── 2. scan_idempotency ──────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.scan_idempotency (
  key         text        PRIMARY KEY,
  user_id     uuid        NOT NULL,
  result      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_idempotency_created
  ON public.scan_idempotency (created_at);

ALTER TABLE public.scan_idempotency ENABLE ROW LEVEL SECURITY;
-- No policies → service-role only.

COMMENT ON TABLE public.scan_idempotency IS
  'Short-lived dedup cache. Keyed by user_id + requestId. ' ||
  'Result rows older than 60s are ignored on read and ' ||
  'deleted opportunistically by the caller.';

/* ─── 3. check_rate_limit RPC ──────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope          text,
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now            timestamptz := now();
  v_window_start   timestamptz;
  v_count          integer;
  v_window_end     timestamptz;
  v_retry_after    integer;
BEGIN
  -- Look up the current window for this (scope, key).
  SELECT window_starts_at, count
    INTO v_window_start, v_count
    FROM public.scan_rate_limits
   WHERE scope = p_scope AND key = p_key
   FOR UPDATE;

  -- No row, or the existing window has expired → start a new window at 1.
  IF NOT FOUND
     OR v_window_start + make_interval(secs => p_window_seconds) <= v_now
  THEN
    INSERT INTO public.scan_rate_limits (scope, key, window_starts_at, count)
         VALUES (p_scope, p_key, v_now, 1)
    ON CONFLICT (scope, key) DO UPDATE
         SET window_starts_at = v_now,
             count            = 1;
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- Inside the active window. Under cap → increment and allow.
  IF v_count < p_limit THEN
    UPDATE public.scan_rate_limits
       SET count = count + 1
     WHERE scope = p_scope AND key = p_key;
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- At cap → compute retry_after and refuse.
  v_window_end  := v_window_start + make_interval(secs => p_window_seconds);
  v_retry_after := GREATEST(1, CEIL(EXTRACT(epoch FROM (v_window_end - v_now))))::integer;
  RETURN jsonb_build_object(
    'ok', false,
    'retry_after_sec', v_retry_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;

COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS
  'Atomic check-and-increment for fixed-window rate limits. ' ||
  'Returns {ok:true} when allowed, {ok:false,retry_after_sec:N} when refused. ' ||
  'SECURITY DEFINER so service-role callers can use it; ' ||
  'PUBLIC execute is revoked.';

/* ─── 4. consume_scan RPC ──────────────────────────────────────────── */
-- Atomically check the user's tier + monthly cap + topup credits, and
-- increment the appropriate counter. Replaces the silent "do nothing"
-- behavior of the old route where members could scan unlimited times.
CREATE OR REPLACE FUNCTION public.consume_scan(
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership       text;
  v_used             integer;
  v_topup_remaining  integer;
  v_quota_reset_at   timestamptz;
  v_monthly_cap      integer;  -- NULL = unlimited
BEGIN
  -- Lock the row so concurrent scans don't race.
  SELECT
      COALESCE(membership, 'free'),
      COALESCE(id_scans_used, 0),
      COALESCE(scans_remaining, 0),
      COALESCE(quota_reset_at, now() + interval '30 days')
    INTO v_membership, v_used, v_topup_remaining, v_quota_reset_at
    FROM public.profiles
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason',  'user_not_found'
    );
  END IF;

  -- Monthly window expired? Roll over.
  IF v_quota_reset_at <= now() THEN
    v_used := 0;
    v_quota_reset_at := now() + interval '30 days';
    UPDATE public.profiles
       SET id_scans_used = 0,
           quota_reset_at = v_quota_reset_at,
           last_reset     = now()
     WHERE id = p_user_id;
  END IF;

  -- Tier → monthly cap.
  --   Pro / Elite (founder) → unlimited (NULL) — but we still increment
  --     id_scans_used so we have telemetry on actual usage.
  --   Member / garden / standard → 100/month.
  --   Free / null / anything else → 0 (no subscription).
  v_monthly_cap := CASE
    WHEN v_membership IN ('pro', 'elite')                  THEN NULL
    WHEN v_membership IN ('member', 'garden', 'standard')  THEN 100
    ELSE 0
  END;

  -- Pro / Elite (unlimited): just record the usage and allow.
  IF v_monthly_cap IS NULL THEN
    UPDATE public.profiles
       SET id_scans_used = id_scans_used + 1,
           updated_at    = now()
     WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'allowed',          true,
      'unlimited',        true,
      'monthly_used',     v_used + 1,
      'monthly_cap',      NULL,
      'topup_remaining',  v_topup_remaining,
      'quota_reset_at',   v_quota_reset_at
    );
  END IF;

  -- Free / no tier: no path to scan.
  IF v_monthly_cap = 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason',  'no_subscription'
    );
  END IF;

  -- Within the monthly cap → spend a monthly scan.
  IF v_used < v_monthly_cap THEN
    UPDATE public.profiles
       SET id_scans_used = id_scans_used + 1,
           updated_at    = now()
     WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'allowed',          true,
      'monthly_used',     v_used + 1,
      'monthly_cap',      v_monthly_cap,
      'monthly_remaining', v_monthly_cap - (v_used + 1),
      'topup_remaining',  v_topup_remaining,
      'quota_reset_at',   v_quota_reset_at
    );
  END IF;

  -- Monthly cap exhausted but topup credits available → spend topup.
  IF v_topup_remaining > 0 THEN
    UPDATE public.profiles
       SET scans_remaining = scans_remaining - 1,
           updated_at      = now()
     WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'allowed',          true,
      'from_topup',       true,
      'monthly_used',     v_used,
      'monthly_cap',      v_monthly_cap,
      'monthly_remaining', 0,
      'topup_remaining',  v_topup_remaining - 1,
      'quota_reset_at',   v_quota_reset_at
    );
  END IF;

  -- Out of monthly AND out of topups.
  RETURN jsonb_build_object(
    'allowed',          false,
    'reason',           'monthly_cap_reached',
    'monthly_used',     v_used,
    'monthly_cap',      v_monthly_cap,
    'topup_remaining',  0,
    'quota_reset_at',   v_quota_reset_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.consume_scan(uuid) IS
  'Atomically enforce monthly cap + topup spend, and increment counters. ' ||
  'Called by /api/scan AFTER the OpenAI call succeeds so failed scans ' ||
  'do not consume a user''s quota. Returns {allowed, reason?, ...usage}.';

/* ─── 5. refund_scan RPC ───────────────────────────────────────────── */
-- Reverses a consume_scan() call when the OpenAI request failed and we
-- never produced a usable result. Decrements id_scans_used (preferred)
-- or increments scans_remaining (when the scan was paid from topup).
-- Never goes below zero. Safe to call multiple times — the worst case
-- is over-refunding by one if the caller is buggy, never under-charging.
CREATE OR REPLACE FUNCTION public.refund_scan(
  p_user_id     uuid,
  p_from_topup  boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_from_topup THEN
    UPDATE public.profiles
       SET scans_remaining = scans_remaining + 1,
           updated_at      = now()
     WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
       SET id_scans_used = GREATEST(0, id_scans_used - 1),
           updated_at    = now()
     WHERE id = p_user_id;
  END IF;
  RETURN jsonb_build_object('refunded', true, 'from_topup', p_from_topup);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_scan(uuid, boolean) FROM PUBLIC;

COMMENT ON FUNCTION public.refund_scan(uuid, boolean) IS
  'Reverses a consume_scan() when the AI call failed. Caller must pass ' ||
  'the same from_topup flag that consume_scan returned, so we refund ' ||
  'the correct counter.';

/* ─── 6. Cleanup helper (lazy; called from the app every so often) ──── */
CREATE OR REPLACE FUNCTION public.purge_stale_rate_limit_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_rows int;
  v_idem_rows int;
BEGIN
  -- Anything whose window ended more than 1 day ago is unreachable.
  DELETE FROM public.scan_rate_limits
   WHERE window_starts_at < now() - interval '1 day'
  RETURNING 1 INTO v_rate_rows;

  -- Idempotency records older than the 60s read TTL plus a buffer.
  DELETE FROM public.scan_idempotency
   WHERE created_at < now() - interval '5 minutes'
  RETURNING 1 INTO v_idem_rows;

  RETURN jsonb_build_object(
    'rate_limits_purged',  COALESCE(v_rate_rows, 0),
    'idempotency_purged',  COALESCE(v_idem_rows, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_stale_rate_limit_state() FROM PUBLIC;

COMMIT;

/* ─── Smoke checks (run separately after migration) ──────────────────

  -- 1. Tables visible:
  SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('scan_rate_limits', 'scan_idempotency');

  -- 2. Functions visible:
  SELECT proname FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname IN ('check_rate_limit', 'consume_scan', 'purge_stale_rate_limit_state');

  -- 3. Rate-limit smoke test (as service role in SQL editor):
  SELECT public.check_rate_limit('test', 'k1', 2, 60);  -- {ok:true}
  SELECT public.check_rate_limit('test', 'k1', 2, 60);  -- {ok:true}
  SELECT public.check_rate_limit('test', 'k1', 2, 60);  -- {ok:false, retry_after_sec:...}

  -- 4. consume_scan smoke test (replace UUID with a real test user):
  SELECT public.consume_scan('00000000-0000-0000-0000-000000000000'::uuid);

──────────────────────────────────────────────────────────────────────── */
