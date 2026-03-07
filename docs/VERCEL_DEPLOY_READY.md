# Vercel Deployment — Ready State

## Branch to deploy

- **Branch:** `feature/reference-image-pipeline`
- **Commit:** `8a3b768` (merge slim-app-cleanup: add lib/, slim app scope for buildability)

## Critical: Do not deploy older commits

Commit `38ad2db` (and anything before the merge) is **not buildable** — it lacks `lib/` (scanner, garden, etc.) and will fail with module-not-found errors.

Ensure Vercel deploys `8a3b768` or later.

## Redeploy

If Vercel built an older commit:

1. In Vercel: Project → Deployments
2. Trigger **Redeploy** for the latest deployment, or create a new deployment from branch `feature/reference-image-pipeline`
3. Confirm the deployment log shows commit `8a3b768`

## Environment variables (Vercel)

Ensure these are set in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (for `/api/scan/judge`)
