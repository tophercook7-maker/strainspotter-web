# StrainSpotter — Current Status Report

---

## 1) CURRENT FEATURES INVENTORY

- **Garden home (/garden) console live tiles (polling /api/garden/console)**  
  - **Key files:** `app/garden/page.tsx`, `app/garden/GardenConsoleLiveClient.tsx`, `app/api/garden/console/route.ts`, `lib/garden/getLatestGardenSensorReading.ts`, `lib/garden/getPublicGardenId.ts`  
  - **DB tables:** `public.gardens`, `public.garden_sensor_readings` (latest by `recorded_at` DESC for public garden).

- **Console ingest endpoint (/api/garden/console/ingest)**  
  - **Key files:** `app/api/garden/console/ingest/route.ts`  
  - **DB tables:** `public.garden_sensor_readings` (inserts: garden_id, temp_f, rh, vpd, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, source, recorded_at).

- **Plants MVP (/garden/plants, /garden/plants/new, /garden/plants/[id])**  
  - **Key files:** `app/garden/plants/page.tsx`, `app/garden/plants/PlantsListClient.tsx`, `app/garden/plants/new/page.tsx`, `app/garden/plants/new/NewPlantForm.tsx`, `app/garden/plants/[id]/page.tsx`  
  - **DB tables:** `public.plants` (002_plants.sql).

- **Plant logs + filters + templates bar**  
  - **Key files:** `app/garden/plants/[id]/LogTemplatesBar.tsx`, `app/garden/plants/[id]/AddLogForm.tsx`  
  - **DB tables:** App uses plant-scoped logs; `public.logs` in 013_ppm_mvp is grow-scoped — confirm if a dedicated plant log table or views exist for this UI.

- **Tasks (open tasks, due/overdue counts on list, recipes, complete + next)**  
  - **Key files:** `app/garden/plants/[id]/TasksCard.tsx`, `app/garden/plants/PlantsListClient.tsx`  
  - **DB tables:** `public.plant_tasks` (20250211000002_add_plant_tasks.sql).

- **Environment readings**  
  - **Key files:** `app/garden/plants/[id]/EnvironmentCard.tsx`  
  - **DB tables:** `public.plant_environment_readings` (20250211000001_add_plant_environment_readings.sql): temp_f, rh, vpd, note, occurred_at.

- **Inputs cost tracking + cost/gram**  
  - **Key files:** `app/garden/plants/[id]/InputsCard.tsx`  
  - **DB tables:** `public.plant_inputs` (20250211000003_add_plant_inputs.sql): kind, name, amount, cost_usd, note, occurred_at.

- **Harvests (one per plant) + list pill**  
  - **Key files:** `app/garden/plants/[id]/page.tsx` (harvest UI), `app/garden/plants/PlantsListClient.tsx`  
  - **DB tables:** `public.plant_harvests` (20250131000000_plant_harvests.sql): one row per plant (unique on plant_id), dry_weight_g, wet_weight_g, harvested_at.

- **Timeline feed**  
  - **Key files:** `app/garden/plants/[id]/TimelineCard.tsx`  
  - **DB tables:** Aggregates from plant_tasks, plant_environment_readings, plant_inputs, plant_harvests (and logs if applicable).

- **Scanner (backend-first + fallback + history save notices + lock)**  
  - **Key files:** `app/garden/scanner/page.tsx`, `app/actions/saveScanHistory.ts`, `app/api/scan/judge/route.ts`, `app/api/scans/[id]/route.ts`, `lib/scanner/dbLoader.ts`, `lib/scanner/resultPayloadAdapter.ts`  
  - **DB tables:** `public.scans` (id, garden_id, user_id, image_url, result_payload, status, processed_at, etc. — 013_ppm_mvp creates scans with grow_id/model_output; app expects garden_id/result_payload — schema may have been extended elsewhere). **Uploads/vault:** `vault_strains`, `vault_scan_events` (api/scan/judge).

- **Scan history (list + detail)**  
  - **Key files:** `app/garden/history/page.tsx`, `app/garden/history/[id]/page.tsx`  
  - **DB tables:** `public.scans` (select for history list and by id for detail).

---

## 2) DATABASE STATE / MIGRATIONS

### Migrations relevant to gardens, scans/history, uploads, plants/logs/tasks/env/inputs/harvests, garden_sensor_readings

| Area | Migrations |
|------|------------|
| **Gardens** | No `CREATE TABLE gardens` in repo; table is referenced by 20250211000004, 20250211000005_console_rls, 20260211000010, and plant tables. Must exist (or be created elsewhere) for console and plants. |
| **Scans / history** | `013_ppm_mvp.sql` creates `scans` (grow_id, image_url, embedding_ref, model_output). App uses `garden_id`, `result_payload`, `status`, `processed_at` — likely added in another migration or manually. |
| **Uploads** | Vault: `016_vault_schema.sql`, `017_vault_storage_bucket.sql`, `018_vault_embeddings.sql`; judge uses `vault_strains`, `vault_scan_events`. |
| **Plants / logs / tasks / env / inputs / harvests** | `002_plants.sql` (plants), `20250131000000_plant_harvests.sql`, `20250211000001_add_plant_environment_readings.sql`, `20250211000002_add_plant_tasks.sql`, `20250211000003_add_plant_inputs.sql`. Logs in 013 are grow-scoped. |
| **garden_sensor_readings** | `20260211000010_add_garden_sensor_readings.sql` (creates table with metrics jsonb, occurred_at); `20250211000004_garden_sensor_readings_columns.sql` (creates/alters with temp_f, rh, vpd, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, recorded_at); `20260212000000_garden_sensor_readings_columns.sql` (adds same columns + recorded_at to existing table). |

### Tables required for the app to run without warnings

- **Required:** `public.gardens`, `public.garden_sensor_readings` (with columns: garden_id, temp_f, rh, vpd, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, source, recorded_at, created_at), `public.plants`, `public.plant_tasks`, `public.plant_environment_readings`, `public.plant_inputs`, `public.plant_harvests`, `public.scans` (with garden_id, image_url, result_payload, status, processed_at for history and saveScanHistory).
- **Optional for scanner:** `vault_strains`, `vault_scan_events`; profiles/transactions for quota if used.

### Duplicate / obsolete migrations to consider removing

- **Numbered duplicates (prefer one, remove the other):**  
  `006_grow_notes.sql` / `006_grow_notes 2.sql`  
  `007_scan_quota_fields.sql` / `007_scan_quota_fields 2.sql`  
  `008_scan_quota_functions.sql` / `008_scan_quota_functions 2.sql`  
  `009_scan_topups.sql` / `009_scan_topups 2.sql`  
  `010_scan_topups_logic.sql` / `010_scan_topups_logic 2.sql`  
  `011_feature_flags.sql` / `011_feature_flags 2.sql`  
  `012_owner_field.sql` / `012_owner_field 2.sql`  
  `014_garden_logbook_label.sql`, `014_garden_messaging.sql`, `014_grow_and_scan_labels.sql` (multiple 014s).  
- **garden_sensor_readings:** Three migrations touch the same table: `20260211000010_add_garden_sensor_readings.sql` (create with jsonb), `20250211000004_garden_sensor_readings_columns.sql` (create/alter with typed columns), `20260212000000_garden_sensor_readings_columns.sql` (add columns). Consolidate to a single source of truth (e.g. one create with typed columns + recorded_at) and remove or supersede the others to avoid order-dependent conflicts.  
- **PPM:** `013_ppm_mvp.sql` vs `20260106_ppm_mvp.sql` — check for overlap and keep one path.

---

## 3) CURRENT FAILURES / WARNINGS

### Build-time / runtime errors

- **Build:** `npm run build` has been fixed (TypeScript and JSX fixes applied in history page, scanner page, WikiStyleResultPanel, PlantsListClient, PlantStatusActions, TasksCard). No known remaining build errors.  
- **Runtime:** Supabase “not configured” is resolved once `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. During static generation, missing Supabase env can log errors for routes that hit the DB (e.g. strains, history) — they do not fail the build.

### “DB AUTHORITY — strains.json only 0 strains” warning

- **Where it triggers:** `lib/scanner/dbLoader.ts` in `loadStrainDatabase()`.  
- **Logic:** Loads from server path `lib/data/strains.json` (or client paths `/data/strains.json`, `/api/strains.json`). If count &lt; 10,000: in **production** it throws; in **development** it logs `DB AUTHORITY — CRITICAL: Strain database has only 0 strains...` and does **not** throw so the app can run.  
- **Expected file:** `lib/data/strains.json` (array or `{ strains: [...] }`) with ≥ 10,000 entries.  
- **Check:** `npm run check:strains` (scripts/checkStrainsJson.mjs) — exits 1 if missing or count &lt; 10,000.

### Supabase linter SECURITY findings (grouped)

- **auth_users_exposed (views in public exposing auth.users)**  
  - **Views:** `public.v_scan_credit_summary_moderator`, `public.user_credit_balance`, `public.v_chat_messages`, `public.v_chat_messages_enriched`.  
  - **Why exposed:** In `public` schema and (before remediation) exposed to PostgREST; they reference `auth.users`, so anon could infer user data.  
  - **Remediation in repo:** `20250211000005_internal_schema_lockdown.sql` (create internal + REVOKE), `20250211000006_internal_views_auth_users.sql` (move these four views to `internal` + REVOKE). After applying, these views live in `internal` and are not exposed to anon/authenticated.

- **policy_exists_rls_disabled**  
  - **Meaning:** Tables have RLS policies but RLS is disabled (or was at lint time).  
  - **Exact objects:** Not listed in this report; run the Supabase linter again and note each table name and policy name under this finding.  
  - **Fix:** For each such table, run `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;` (and ensure policies are correct). Console tables are already enabled in `20250211000005_console_rls.sql` for `gardens` and `garden_sensor_readings`.

---

## 4) NEXT 5 ACTIONS (highest leverage)

| # | What to change | Where | Why (risk / user impact) | How to verify |
|---|----------------|--------|---------------------------|---------------|
| 1 | Apply internal schema + view moves + REVOKEs | Supabase (run `20250211000005_internal_schema_lockdown.sql`, then `20250211000006_internal_views_auth_users.sql`) | Removes auth_users_exposed for the four views and locks `internal` from anon/authenticated. | In SQL Editor: `SELECT * FROM internal.user_credit_balance LIMIT 1;` (as service role). As anon via API, these views must not be visible. |
| 2 | Ensure `gardens` table exists | Supabase (create if missing) | Console and getPublicGardenId depend on it; plant tables reference it. Missing table causes 500 on /api/garden/console and ingest. | `SELECT id FROM public.gardens WHERE user_id IS NULL LIMIT 1;` — should return one row (or insert Public Garden and retry). |
| 3 | Align `scans` schema with app | Supabase migrations | saveScanHistory and history pages expect `garden_id`, `result_payload`, `status`, `processed_at`. 013_ppm_mvp has `grow_id`, `model_output`. Prevents insert/select errors. | Add migration to add columns if not present: `garden_id`, `result_payload`, `status`, `processed_at`. Then: insert a test row from saveScanHistory and GET /api/scans/:id. |
| 4 | Consolidate garden_sensor_readings migrations | `supabase/migrations/` | Three migrations define or alter the same table; running in different orders can yield different schemas or errors. | Pick one “authoritative” migration (e.g. 20250211000004 or 20260211000010 + 20260212000000), document order, remove or replace the redundant one(s). Run migrations on a fresh DB and confirm table has required columns. |
| 5 | Restore or add strains dataset | `lib/data/strains.json` | Scanner accuracy needs ≥10k strains; production hard-fails without it. | Run `npm run check:strains`; expect “strains.json count:” ≥ 10000 and exit 0. Restart dev and confirm no DB AUTHORITY error in console. |

---

**Document generated for StrainSpotter repo.**  
No abbreviations in user-facing labels (VPD, RH, etc. spelled out where used in features).  
For policy_exists_rls_disabled, re-run the Supabase linter and fill in the exact table and policy names from its output.
