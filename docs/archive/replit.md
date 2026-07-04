# StrainSpotter Web — Replit Agent Guide

## What this app is
StrainSpotter is a Next.js App Router web app for AI-assisted cannabis strain identification. The scanner flow is the primary product path. The root route redirects users straight into the scanner.

## Current state of the repo
- Framework: Next.js 16 + React 18 + TypeScript
- UI stack: MUI + Tailwind/PostCSS
- Hosting target: Vercel-first, but local development should work in Replit
- Core API route: `app/api/scan/route.ts`
- Main landing behavior: `app/page.tsx` redirects to `/garden/scanner`
- Metadata, age gate, and startup DB init are defined in `app/layout.tsx`
- Strain library bootstrap is handled by `lib/scanner/dbInitializer.tsx`
- Strain analysis currently uses OpenAI via `OPENAI_API_KEY`

## Product intent
The product should feel premium, fast, and mobile-first. The scanner is not a toy demo. It should evolve into a production-grade SaaS app with:
- AI image analysis
- structured strain database and cultivar matching
- terpene/effects/grow guidance
- authentication and accounts
- saved scans/history
- monetization / subscriptions
- admin tooling and data quality controls

## What Replit Agent should optimize for
1. Preserve the existing app instead of rebuilding from scratch.
2. Keep the current route structure unless there is a strong reason to refactor.
3. Prefer small, safe commits and incremental improvements.
4. Do not remove the current scan API flow without replacing it with an equivalent or better version.
5. Keep all secrets in Replit Secrets / env vars. Never hardcode keys.
6. Keep TypeScript strictness improving over time; do not introduce `any` unless absolutely necessary.
7. Favor maintainable app architecture over quick hacks.
8. If a feature is incomplete, scaffold it cleanly behind obvious TODO markers instead of pretending it is done.

## First things to inspect before changing anything
- `package.json`
- `next.config.ts`
- `vercel.json`
- `app/layout.tsx`
- `app/page.tsx`
- `app/api/scan/route.ts`
- `lib/scanner/`
- `lib/data/`
- any auth, billing, scanner, or garden routes/components

## Known realities / constraints
- The current README is generic and does not describe the real product.
- `next.config.ts` currently ignores TypeScript build errors to avoid blocking deploys. Replit Agent should reduce those errors over time instead of leaning on that forever.
- `vercel.json` extends the scan route duration because image analysis can run long.
- The scan route expects `OPENAI_API_KEY`.
- If Supabase is used elsewhere in the repo, preserve existing integration patterns and document any missing env vars.

## Required environment variables
Minimum known requirement:
- `OPENAI_API_KEY`

Potentially required depending on code paths Agent discovers:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- any site URL / webhook envs used for auth or billing

If any of the above are missing from the codebase, Agent should document the exact final env list in the README after inspection.

## Build and run expectations
Use npm.
- install: `npm install`
- dev: `npm run dev`
- build: `npm run build`
- start: `npm run start`

## High-priority finish plan
1. Audit the current route tree, components, and data dependencies.
2. Replace the generic README with real project documentation.
3. Add `.env.example` with every required environment variable discovered in code.
4. Fix the most important TypeScript and runtime issues blocking reliable builds.
5. Verify scanner upload -> API route -> JSON response -> UI rendering flow.
6. Add or improve persistent storage for scan history and user accounts.
7. Add production-safe error handling, loading states, and empty states.
8. Tighten monetization/auth flows only after the scan experience is stable.
9. Keep deploy compatibility with Vercel unless the owner explicitly chooses another host.

## Coding preferences
- Prefer server actions / route handlers only where they simplify the architecture.
- Keep components small and composable.
- Use descriptive names, not vague utility names.
- Centralize external service clients.
- Never silently remove business logic.
- Leave comments only when they prevent confusion; do not comment obvious code.

## Definition of done for a meaningful milestone
A meaningful milestone is not "the app compiles." It means:
- scanner works end-to-end
- environment variables are documented
- README explains the real product and setup
- key flows do not crash on first use
- build is reproducible
- unfinished areas are clearly marked and organized
