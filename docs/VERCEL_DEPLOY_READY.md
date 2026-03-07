# Vercel Deployment — Ready State

## Branch to deploy

- **Branch:** `feature/reference-image-pipeline`
- **Commit:** `f090034` or later (includes slim-app-cleanup merge; do not deploy `38ad2db`)

## Critical: Do not deploy older commits

Commit `38ad2db` (and anything before the merge) is **not buildable** — it lacks `lib/` (scanner, garden, etc.) and will fail with module-not-found errors.

Ensure Vercel deploys `f090034` or the latest commit on this branch.

## Redeploy

If Vercel built an older commit:

1. In Vercel: Project → Deployments
2. Trigger **Redeploy** for the latest deployment, or create a new deployment from branch `feature/reference-image-pipeline`
3. Confirm the deployment log shows commit `f090034` or newer

## Environment variables (Vercel)

### Required for production

| Variable | Purpose | What breaks if missing |
|----------|---------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Scanner (Log Book), Grow Coach, History, Activity ping — routes return 503 |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase auth (preferred) | Same as above; use anon key fallback if needed |
| `OPENAI_API_KEY` | Vision + embeddings for `/api/scan/judge` | Scanner judge API returns 503 when called |

### Optional

| Variable | Purpose | What breaks if missing |
|----------|---------|------------------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Fallback when service role key not set | Use `SUPABASE_SERVICE_ROLE_KEY` instead for full server access |
| `NEXT_PUBLIC_API_BASE` | Backend-first scanner base URL | Scanner falls back to client-side judge |

### Build vs runtime

- **Build-time:** None of these are required. The app builds without any env vars.
- **Runtime:** Supabase vars are required for Log Book, Grow Coach, History, Activity. `OPENAI_API_KEY` is required only when the Scanner judge endpoint is called.

### Slim app features and env requirements

| Feature | Env vars needed |
|---------|-----------------|
| **Scanner** | `OPENAI_API_KEY` (for judge); `NEXT_PUBLIC_SUPABASE_URL` + key (for saving scans) |
| **Log Book (History)** | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Grow Coach** | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

### Minimum Vercel setup

Set in Vercel → Project → Settings → Environment Variables:

1. `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
2. `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` for read-only)
3. `OPENAI_API_KEY` — for Scanner strain identification

## Redeploy target

- **Branch:** `feature/reference-image-pipeline`
- **Required env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `OPENAI_API_KEY`
