# StrainSpotter Backend Handoff (Complete)

\n## Quick Overview
StrainSpotter is a cannabis strain database + AI image scanning app with social features (groups, grower directory, journals, grow logs, events). Backend serves strain data from JSON files for speed, mirrors to Supabase for persistence and user-generated content.

\n## Environment Setup
- **Secrets**: `env/.env.local` (NEVER `backend/.env` or root `.env`)
- **Required env vars**:
\n```bash
  SUPABASE_URL=...
  SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=... (for admin ops like bucket creation)
  GOOGLE_APPLICATION_CREDENTIALS=../env/google-vision-key.json
  # OR inline: GOOGLE_VISION_JSON='{"type":"service_account",...}'
  PORT=5181
\n```
- **Storage**: Supabase Storage bucket `scans` (public). Backend auto-creates on boot if service role key present.
- **Health**: GET /health → `{ supabaseConfigured: bool, googleVisionConfigured: bool }`

\n## Database Schema (Supabase/Postgres)
- **Migration**: `backend/migrations/2025_create_full_schema.sql`
- **Extensions**: uuid-ossp, pgcrypto
- **Tables** (public schema):
  - `users`: id(uuid), username, email, avatar_url, created_at
  - `strains`: slug(pk), name, type, description, effects[], flavors[], lineage, thc, cbd, lab_test_results(jsonb), seed_sources(jsonb), grow_guide(jsonb)
  - `grow_logs`: id, user_id→users, strain_slug→strains, stage, notes, images[], health_status(jsonb), remedies(jsonb), progress(jsonb), created_at
  - `scans`: id, user_id→users, image_url, matched_strain_slug→strains, created_at, plant_age, plant_health(jsonb), grow_log_id→grow_logs
  - `groups`: id, name, created_by→users, created_at
  - `group_members`: (group_id, user_id pk), joined_at
  - `messages`: id, group_id→groups, user_id→users, content, created_at
  - `growers`: id, user_id→users, location, specialties[], available_strains[], seed_sources(jsonb), reputation(int), badges[], created_at
  - `journals`: id, user_id→users, scan_id→scans, content, is_public(bool), created_at
  - `events`: id, name, location, date, description, created_by→users

- **RLS**: Dev mode policies enabled (permissive: SELECT/INSERT/UPDATE USING (true)). For production, switch to owner-only: `USING (user_id = auth.uid())`.

- **Indexes to add** (optional, for perf):
  - scans.created_at DESC
  - messages.group_id, messages.created_at DESC
  - grow_logs.user_id, grow_logs.created_at DESC

\n## API Endpoints (Base: http://localhost:5181)

\n### Core Scanning Flow (implemented)
- **POST /api/uploads**
  - Body: `{ filename, contentType, base64 }`
  - Uploads to bucket `scans`, inserts row in `scans` (status=pending)
  - Response: `{ id, image_url }`
- **GET /api/scans**
  - Returns recent scans (max 100, sorted by created_at desc)
  - Response: `{ scans: [...] }`
- **GET /api/scans/:id**
  - Response: `{ scan: {...} }`
- **POST /api/scans/:id/process**
  - Runs Google Vision on scan.image_url
  - Updates scans.result, status='done', processed_at
  - Response: `{ ok: true, result }`

\n### Strains (existing)
- **GET /api/strains** - list/filter (from JSON file)
- **GET /api/strains/:slug** - single strain
- **GET /api/search?q=...** - fuzzy search for strain names

\n### Dev Dashboard
- **GET /api/dev/stats**
  - Returns `{ totalStrains, importReport }`
  - importReport from `backend/data/import_report.json`
  - Daily new derived from `importReport.counts.matched` (or enhance by date diffing)

\n### Growers (Supabase-backed)
- **GET /api/growers** - list all growers
- **POST /api/growers** - create grower profile
  - Body: `{ user_id, location, specialties[], available_strains[], seed_sources, reputation, badges }`

\n### Groups & Messages (Supabase-backed)
- **GET /api/groups** - list groups
- **POST /api/groups** - create group
  - Body: `{ name, user_id }`
- **GET /api/groups/:id/messages** - list messages for group
- **POST /api/groups/:id/messages** - send message
  - Body: `{ user_id, content }`

\n### Journals (Supabase-backed)
- **GET /api/journals?user_id=...** - list journals (filtered by user_id if provided)
- **POST /api/journals** - create journal entry
  - Body: `{ user_id, scan_id, content, is_public }`

\n### Events (Supabase-backed)
- **GET /api/events** - list events (ordered by date)
- **POST /api/events** - create event
  - Body: `{ name, location, date, description, created_by }`

\n### Grow Logs (Supabase-backed)
- **GET /api/growlogs?user_id=...** - REQUIRED user_id; list grow logs
- **POST /api/growlogs** - create grow log
  - Body: `{ user_id, strain_slug, stage, notes, images[], health_status, remedies, progress }`
- **PUT /api/growlogs/:id** - update grow log
- **DELETE /api/growlogs/:id** - delete grow log

\n### Feedback (Supabase-backed, special group)
- **GET /api/feedback/messages** - list feedback messages (auto-creates "Feedback" group if missing)
- **POST /api/feedback/messages** - send feedback
  - Body: `{ content, user_id }`

\n## Future Endpoints (specs for next sprint)
- **POST /api/diagnose** - plant health diagnostics via Vision API
  - Body: `{ base64 | image_url }`
  - Output: `{ plant_age, plant_health: { issues[], severity, recommendations[] } }`
- **GET /api/strains/:slug/grow_guide** - strain-specific grow guide from `strains.grow_guide`
- **GET /api/strains/:slug/seed_sources** - seed availability from `strains.seed_sources`
- **GET /api/recommendations?user_id=...** - personalized strain recommendations

\n## Error Handling
- 400: malformed inputs
- 404: not found
- 500: service errors (Supabase, Vision)
- JSON shape: `{ error: "message" }`

\n## Security & Auth
- **Short term (dev)**: public/no-auth routes with permissive RLS
- **Medium term**: Supabase Auth JWT; attach `user_id = auth.uid()` server-side checks; owner-only RLS
- **Group membership**: enforce in routes for groups/messages

\n## Logging & Observability
- Minimal logs in Express (start/health)
- Pipeline/import summaries in `backend/data/import_report.json`
- Optional: add request logging middleware in dev

\n## Performance & Caching
- **Strain data**: served from JSON files with fs.watch auto-reload (fast, already implemented)
- **When migrating to DB queries**: add in-memory cache for common queries
- **Paginate list endpoints** (not yet implemented, do if needed)

\n## Edge Cases
- Large images: 10mb limit on JSON body (set); consider size guard
- Bucket missing: ensureBucketExists logic included
- Vision disabled: report meaningful error
- RLS insert/update failures: common error = "violates row-level security"; ensure dev policies exist

\n## Acceptance Checklist
- [ ] /health returns supabaseConfigured and googleVisionConfigured=true
- [ ] /api/uploads inserts into scans and returns id + URL
- [ ] /api/scans/:id/process updates result and status='done'
- [ ] /api/dev/stats shows correct totalStrains and import_report
- [ ] Supabase routes (growers, groups, journals, events, growlogs) respond correctly
- [ ] RLS dev policies allow inserts/updates/reads without errors
- [ ] Bucket 'scans' present and public

\n## Notes
- Data pipeline runs daily at 3 AM UTC via GitHub Actions (`.github/workflows/strain-pipeline.yml`)
- Backend mounts routes in `backend/index.js`; each route module in `backend/routes/`
- Frontend connects via `http://localhost:5181` (API_BASE in `frontend/src/config.js`)
