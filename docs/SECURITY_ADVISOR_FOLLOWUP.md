# Security Advisor remediation – manual follow-ups

After running `supabase/migrations/20260225000000_security_advisor_remediation.sql`:

## 1. Tables where ownership column is unknown (TODO in migration)

- **user_entitlements** – Policy added only if `user_id` exists. If ownership uses another column (e.g. `owner_id`), add a policy manually.
- **user_usage** – Same as above; policy uses `user_id` if present.
- **favorites** – Same; policy uses `user_id` if present.
- **uploads** – Policy uses `user_id` or `owner_id` if present. If different, add policy manually.
- **saved_strains** – Policy uses `user_id` if present.

**Action:** For each table, confirm the ownership column in `information_schema.columns` and add or adjust RLS policies so `USING`/`WITH CHECK` use the correct column.

## 2. Admin mechanism for grower_verification_requests

- Migration allows **SELECT** only when `public.profiles.role = 'admin'` for the current user.
- If your app uses a different admin check (e.g. `system_accounts`, JWT claim, or another table), replace the policy `grower_verification_requests_select_admin` with one that uses that mechanism.

## 3. Views moved to `internal` (auth_users_exposed)

- **v_scan_credit_summary_moderator** and **v_chat_messages_enriched** were moved to `internal` so they are no longer exposed via the public API. They still reference `auth.users`.
- Any app code that used these views from the **public** schema (e.g. PostgREST/anon) must be updated to either:
  - Use a **service_role** client and query `internal.v_scan_credit_summary_moderator` / `internal.v_chat_messages_enriched`, or
  - Use replacement views in `public` that do **not** reference `auth.users` (e.g. join only to `public.profiles` and expose needed fields). Define those views and point the app at them.

## 4. SECURITY DEFINER views set to security_invoker

- All listed public views were altered to `security_invoker = on` (PostgreSQL 15+). If your Postgres version is &lt; 15, those `ALTER VIEW ... SET (security_invoker = on)` steps may be no-ops or fail; check release notes and, if needed, recreate views as invoker and drop definer versions.

## 5. RLS on tables not in the migration list

- Migration enables RLS only on the tables in the `tables_to_protect` array. If Security Advisor still reports **other** public tables without RLS, add them to that array (or a new migration) and enable RLS with deny-by-default or appropriate policies.

## 6. Sensitive column license_number

- **grower_verification_requests.license_number** is only visible to users who can SELECT that table; the migration restricts SELECT to admins. Ensure no other view or API exposes this column to non-admins.
