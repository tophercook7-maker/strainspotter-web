-- Cap the Pro tier at 300 scans/month (was unlimited).
--
-- Pro was `unlimited` in consume_scan(), which left per-user AI cost unbounded
-- on a $9.99 plan. Cap it at 300/month — plenty for scanning every harvest —
-- with top-up packs covering any overflow (same as Member). Existing Founder
-- (`elite`) customers keep unlimited: they were sold "unlimited forever".
--
-- Only the tier→cap CASE changes; every other branch is preserved verbatim.
-- Idempotent (CREATE OR REPLACE). Safe to re-run.

BEGIN;

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
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
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
  --   Elite (legacy Founder lifetime) → unlimited (NULL). Honored forever.
  --   Pro                             → 300/month.
  --   Member / garden / standard      → 100/month.
  --   Free / null / anything else     → 0 (no subscription).
  v_monthly_cap := CASE
    WHEN v_membership = 'elite'                            THEN NULL
    WHEN v_membership = 'pro'                              THEN 300
    WHEN v_membership IN ('member', 'garden', 'standard')  THEN 100
    ELSE 0
  END;

  -- Unlimited (elite only): record usage and allow.
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
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_subscription');
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

COMMIT;
