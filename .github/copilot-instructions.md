## StrainSpotter — AI Coding Agent Guide

This repo powers a cannabis strain database and image scanning app spanning API, web, mobile, and a data pipeline.

### Architecture (where things live)
- Backend API: `backend/` (Express on port 5181) with Supabase + Google Vision
- Web frontend: `frontend/` (React + Vite starter; connect to the API)
- Mobile app: `StrainSpotter_Starter_Integrated_v5/` (Capacitor iOS/Android)
- Data tools: `tools/` (scrape → normalize → enhance → import)

### Data model and hot-reload
- Primary library: `backend/data/strain_library.json` loaded in memory; changes auto-reload via `fs.watch()` in `routes/strains.js`.
- Anonymous lab tests map via `backend/data/test_mapping.json` → served at `/api/strains/:slug/tests`.
- Optional DB mirror: Supabase `strains` table; JSON remains the source of truth for API reads.

### Image scanning flow
1) `POST /api/uploads` with `{ filename, contentType, base64 }` → uploaded to Supabase Storage bucket `scans`, row inserted in `scans` table.
2) `POST /api/scans/:id/process` → Google Vision analysis runs server-side; results saved back to `scans.result`.
3) Optional matching: `POST /api/visual-match` with a Vision result → returns ranked strain matches.
4) Diagnostics: `GET /api/diagnostic/scan?url=...` for an end-to-end test.

### Dev workflow (VS Code friendly)
- Env lives in `env/.env.local` (NOT `backend/.env`). Vision creds supported via file (`GOOGLE_APPLICATION_CREDENTIALS=../env/google-vision-key.json`) or inline `GOOGLE_VISION_JSON`.
- Tasks: "Install Backend Deps", "Start Backend", "PM2 Start Backend", and "Start Frontend".
- Verify: `GET /health` → `{ ok:true, supabaseConfigured:true, googleVisionConfigured:true }`.
- CORS origins: set `CORS_ALLOW_ORIGINS` (defaults to localhost:5173 variants).
- Service role usage: Backend automatically uses `SUPABASE_SERVICE_ROLE_KEY` when present (preferred) for Storage and DB writes/reads on uploads/scans; if missing, it falls back to anon and RLS may block. On boot you'll see: `[boot] Service role client active = true`.

### Environment keys (required)
- Required for local dev:
	- `SUPABASE_URL`
	- `SUPABASE_ANON_KEY`
- Strongly recommended (enables server-side writes bypassing RLS for uploads/scans):
	- `SUPABASE_SERVICE_ROLE_KEY`
- Google Vision (choose one):
	- `GOOGLE_APPLICATION_CREDENTIALS=../env/google-vision-key.json`
	- or `GOOGLE_VISION_JSON` (inline credentials; backend writes the file on boot)

Troubleshooting
- Upload or scan insert fails with foreign key/RLS errors → ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `env/.env.local` and restart backend. Check boot log for `[boot] Service role client active = true`.

### Conventions and patterns
- Slug IDs: `/api/strains/:slug` (e.g., "Blue Dream" → `blue-dream`). Slug logic in `tools/normalize_strain_data.mjs`.
- Pagination/filtering/sort in `/api/strains` via query params (e.g., `?page=1&limit=20&sort=thc:desc`).
- File-first reads: JSON library served from disk; modify via tools and re-run the pipeline when schema changes.
- Uploads are large: JSON body limit is 50MB; server auto-compresses images with `sharp` before storage/vision.
- Membership middleware may enforce trial limits on write paths (see `middleware/membershipCheck.js`).

### Key routes and files
- Endpoints: `/api/strains`, `/api/strains/:slug`, `/api/strains/:slug/tests`, `/api/uploads`, `/api/scans`, `/api/scans/:id`, `/api/scans/:id/process`, `/api/visual-match`, `/api/diagnostic/*`.
- Mounts defined in `backend/index.js`; route modules in `backend/routes/` (e.g., `strains.js`, `diagnostic.js`).
- Supabase/credentials wiring: `backend/supabaseClient.js`, `backend/supabaseAdmin.js`.

### Extend safely
- New API feature: create `backend/routes/<feature>.js`, export an `express.Router()`, and mount in `backend/index.js` under `/api/<feature>`.
- New strain field: update `tools/normalize_strain_data.mjs`, then run `tools/full_pipeline.mjs`; API will hot-reload the updated JSON.

### Common pitfalls
1) Wrong env location → use `env/.env.local` only.
2) Missing `scans` bucket or RLS blocks → add service role key (`SUPABASE_SERVICE_ROLE_KEY`) for writes/reads, or make bucket public in dev.
3) Port/CORS mismatch → backend 5181, frontend 5173; adjust `CORS_ALLOW_ORIGINS`.
4) Manual JSON edits without tools → changes may not follow schema; prefer running the pipeline.

References: `backend/README.md`, `backend/README-ENDPOINTS.md`, `backend/index.js`, `backend/routes/strains.js`, `tools/full_pipeline.mjs`.
