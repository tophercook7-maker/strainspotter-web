-- =============================================================================
-- Security Advisor remediation (single migration)
-- Addresses: 0002 auth_users_exposed, 0007 policy_exists_rls_disabled,
--           0010 security_definer_view, 0013 rls_disabled_in_public,
--           0023 sensitive_columns_exposed
-- No data dropped. Uses IF EXISTS / DO blocks for missing objects.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Enable RLS on every flagged public table (skip if already enabled)
--    Tables: grower_chat_messages, news_posts, user_entitlements, user_usage,
--    favorites, uploads, grower_verification_requests, and other common public
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables_to_protect text[] := ARRAY[
    'grower_chat_messages', 'news_posts', 'user_entitlements', 'user_usage',
    'favorites', 'uploads', 'grower_verification_requests', 'saved_strains',
    'scan_history', 'scans', 'gardens', 'feedback_threads', 'feedback_messages',
    'profiles', 'transactions', 'matcher_config', 'dataset_updates', 'model_versions',
    'scraper_jobs', 'model_registry', 'feature_flags', 'grow_notes', 'plants',
    'plant_tasks', 'plant_environment_readings', 'plant_inputs', 'plant_harvests',
    'plant_logs', 'garden_sensor_readings', 'chat_threads', 'chat_participants',
    'chat_messages', 'chat_ai_requests', 'measurements', 'logs', 'grows'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_protect
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS enabled: public.%', t;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Tables with policies but RLS disabled: already enabled above.
--    Ensure no extra policies added here; existing policies remain.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 3) Minimal SAFE policies: default deny. Add permissive only where needed.
--    User-owned tables: allow access when user_id/owner_id = auth.uid()
--    TODO: If a table uses a different owner column, add policy manually.
-- -----------------------------------------------------------------------------

-- user_entitlements (assume user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_entitlements') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_entitlements' AND column_name = 'user_id') THEN
      DROP POLICY IF EXISTS "user_entitlements_own" ON public.user_entitlements;
      CREATE POLICY "user_entitlements_own" ON public.user_entitlements
        FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    ELSE
      -- TODO: map ownership column for public.user_entitlements
      NULL;
    END IF;
  END IF;
END $$;

-- user_usage (assume user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_usage') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_usage' AND column_name = 'user_id') THEN
      DROP POLICY IF EXISTS "user_usage_own" ON public.user_usage;
      CREATE POLICY "user_usage_own" ON public.user_usage
        FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    ELSE
      -- TODO: map ownership column for public.user_usage
      NULL;
    END IF;
  END IF;
END $$;

-- favorites (assume user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorites') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'favorites' AND column_name = 'user_id') THEN
      DROP POLICY IF EXISTS "favorites_own" ON public.favorites;
      CREATE POLICY "favorites_own" ON public.favorites
        FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    ELSE
      -- TODO: map ownership column for public.favorites
      NULL;
    END IF;
  END IF;
END $$;

-- uploads (assume user_id or owner_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uploads') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'uploads' AND column_name = 'user_id') THEN
      DROP POLICY IF EXISTS "uploads_own" ON public.uploads;
      CREATE POLICY "uploads_own" ON public.uploads
        FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'uploads' AND column_name = 'owner_id') THEN
      DROP POLICY IF EXISTS "uploads_own" ON public.uploads;
      CREATE POLICY "uploads_own" ON public.uploads
        FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
    ELSE
      -- TODO: map ownership column for public.uploads
      NULL;
    END IF;
  END IF;
END $$;

-- grower_verification_requests: INSERT for authenticated; SELECT only for admins (profiles.role = 'admin')
-- Sensitive column license_number: only admins can SELECT (see 0023)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grower_verification_requests') THEN
    DROP POLICY IF EXISTS "grower_verification_requests_insert_authenticated" ON public.grower_verification_requests;
    DROP POLICY IF EXISTS "grower_verification_requests_select_admin" ON public.grower_verification_requests;
    CREATE POLICY "grower_verification_requests_insert_authenticated" ON public.grower_verification_requests
      FOR INSERT TO authenticated WITH CHECK (true);
    -- TODO: if admin check uses a different mechanism (e.g. system_accounts table), replace below
    CREATE POLICY "grower_verification_requests_select_admin" ON public.grower_verification_requests
      FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
      );
  END IF;
END $$;

-- saved_strains (assume user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_strains') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_strains' AND column_name = 'user_id') THEN
      DROP POLICY IF EXISTS "saved_strains_own" ON public.saved_strains;
      CREATE POLICY "saved_strains_own" ON public.saved_strains
        FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    ELSE
      -- TODO: map ownership column for public.saved_strains
      NULL;
    END IF;
  END IF;
END $$;

-- Tables that already have policies (grower_chat_messages, news_posts): do not overwrite.
-- Other tables not explicitly given a permissive policy above remain deny-all by default.

-- -----------------------------------------------------------------------------
-- 4) SECURITY DEFINER views -> security_invoker (PostgreSQL 15+)
--    Preserves existing SELECT definition; view runs as caller, respects RLS.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v text;
  viewlist text[] := ARRAY[
    'feedback_recent', 'direct_messages_with_peer_recent', 'admin_audit_redacted',
    'strains_search_public', 'strain_review_summary', 'active_members',
    'documents_public_view', 'v_unread_counts', 'strains_public_view',
    'nearby_dispensaries_with_strain_prices', 'user_location', 'organizations_public_view',
    'item_messages_public_view', 'v_scan_credit_summary_moderator', 'scans_anon_view',
    'item_members_public_view', 'v_admin_users', 'v_scan_credit_summary',
    'items_public_view', 'public_profiles', 'localized_seed_vendors',
    'direct_message_conversations', 'feedback_overview', 'v_chat_messages_enriched'
  ];
  def text;
BEGIN
  FOREACH v IN ARRAY viewlist
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = v) THEN
      BEGIN
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v);
        RAISE NOTICE 'security_invoker=on: public.%', v;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on public.%: %', v, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5) auth_users_exposed: v_scan_credit_summary_moderator, v_chat_messages_enriched
--    Do NOT reference auth.users in public. Move to internal and revoke from anon/authenticated,
--    OR replace with safe view. Here: move to internal so they are no longer in public.
--    Service role can still use internal.*.
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS internal;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_scan_credit_summary_moderator') THEN
    ALTER VIEW public.v_scan_credit_summary_moderator SET SCHEMA internal;
    RAISE NOTICE 'Moved v_scan_credit_summary_moderator to internal';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_chat_messages_enriched') THEN
    ALTER VIEW public.v_chat_messages_enriched SET SCHEMA internal;
    RAISE NOTICE 'Moved v_chat_messages_enriched to internal';
  END IF;
END $$;

REVOKE ALL ON SCHEMA internal FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA internal FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA internal FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA internal FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal REVOKE ALL ON TABLES FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6) Sensitive column: public.grower_verification_requests.license_number
--    Access already restricted: SELECT only for admins (policy above).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grower_verification_requests' AND column_name = 'license_number') THEN
    COMMENT ON COLUMN public.grower_verification_requests.license_number IS 'Sensitive. Only admins can SELECT; do not expose to anon or non-admin.';
  END IF;
END $$;

COMMIT;
