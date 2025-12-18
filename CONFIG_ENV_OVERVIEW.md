# Configuration & Environment Overview

StrainSpotter uses separate environment files for the backend (Express) and the frontend (Vite + Capacitor). Keep secrets in `env/.env.local` for local development and mirror them in Vercel/Render when deploying.

---

## Backend (`backend/`)

| Variable | Purpose | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | Rest/Realtime endpoint for your Supabase project | **Required** |
| `SUPABASE_ANON_KEY` | Public anon key for RLS-aware queries | **Required** |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin-only operations (scan credits, moderation, logs) | Required for production + diagnostics |
| `GOOGLE_VISION_JSON` **or** `GOOGLE_VISION_CREDENTIALS_PATH` | Credentials for Google Vision (JSON string or file path) | Use `GOOGLE_VISION_JSON` on Vercel |
| `PORT` | Express port (default `5181`) | Keep at `5181` for local dev to match frontend config |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed origins | Add your Vercel frontend URL in production |
| `RLS_MODE` | `dev` (default) keeps permissive mode, `prod` enforces authenticated uploads + user-owned rows | Set to `prod` once Supabase RLS policies lock tables to `auth.uid()` |

**Local dev:** Place these in `env/.env.local`.  
**Vercel:** Set variables under *Project → Settings → Environment Variables* (Preview + Production).  
**Render/PM2:** Mirror these in your service manager or `.env`.

---

## Frontend (`frontend/`)

| Variable | Purpose | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase URL exposed to the browser | Matches backend `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for client-side auth | Matches backend |
| `VITE_API_BASE` | Base URL for the Express API (`https://backend...`) | Required on Vercel; local dev falls back to `http://localhost:5181` |

**Local dev:** Add to `frontend/.env.local` (Vite loads `VITE_*`).  
**Vercel Frontend:** Set the same keys via Vercel → *Environment Variables* (Development + Preview + Production).  
**Capacitor (iOS/Android):** Builds read from `.env.production` generated at build time—ensure `VITE_API_BASE` points to the deployed backend so native apps never call `localhost`.

---

### Quick Checklist

- [ ] `env/.env.local` contains all backend keys (do **not** commit).  
- [ ] `frontend/.env.local` contains Vite keys for local testing.  
- [ ] Vercel backend project: `SUPABASE_*`, `GOOGLE_VISION_JSON`, `CORS_ALLOW_ORIGINS`.  
- [ ] Vercel frontend project: `VITE_SUPABASE_*`, `VITE_API_BASE`.  
- [ ] Render/PM2 (if used): mirror backend env vars.  
- [ ] Capacitor builds pull from production env (no localhost URLs embedded).

Keep this file updated whenever new env vars are introduced.


