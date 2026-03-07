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

Ensure these are set in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (for `/api/scan/judge`)
