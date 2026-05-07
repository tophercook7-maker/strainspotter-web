# Deploy Notes — StrainSpotter

Last updated: May 7, 2026

This doc is the runbook for getting StrainSpotter from `main` to a
working production deploy. Anyone — future Claude, future me, future
contractor — should be able to follow it from a clean checkout to a
green stack.

---

## Pre-flight checks before pushing main

1. **TypeScript clean.** `npx tsc --noEmit` exits 0.
2. **Build clean.** `npm run build` exits 0.
3. **No Finder collision copies.** Run
   `find . -path ./node_modules -prune -o \( -name "* 2.*" -o -name "* 3.*" -o -name "* 4.*" -o -name "* 5.*" \) -delete`
   before commit. They're gitignored but cause ghost typecheck errors.

---

## Required environment variables (Vercel)

These all live in Vercel → Project → Settings → Environment Variables.

### Public — exposed to the browser

| Name | Used by | Notes |
|------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth provider, server gate | Project URL from Supabase dashboard. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth provider, server gate | Public anon JWT. Safe to expose. |

### Secret — server-side only

| Name | Used by | Notes |
|------|---------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` (admin client) | Bypasses RLS. Required for the Stripe webhook to write to `profiles` and `stripe_webhook_events`. |
| `OPENAI_API_KEY` | `/api/scan`, `/api/grow-doctor/diagnose` | API key with GPT-4o Vision access. |
| `STRIPE_SECRET_KEY` | `/api/stripe/*` | Live or test, must match `STRIPE_PRICES` in `lib/stripe/config.ts`. |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Webhook signing secret. **Without this set, the webhook accepts unsigned bodies in dev mode** — never deploy without it in prod. |

---

## Database migrations to apply

Migrations live in `migrations/`. They are NOT auto-applied — they must
be run manually against the Supabase project's SQL editor.

Order matters; this is the chronological list:

1. `2025_01_12_profiles.sql` — base profiles table.
2. `2025_01_12_grow_logbook_v1.sql`
3. `2025_01_19_community_intelligence.sql` and cleanup migration after it.
4. `2025_01_20_scan_quota_backend.sql` — adds `membership` column with
   CHECK constraint allowing `free | garden | standard | pro | elite`.
5. `2025_01_21_desktop_access_control.sql`
6. `2025_01_22_scan_reports.sql`
7. `2025_01_23_scan_feedback.sql` and the update migration after it.
8. `2025_01_23_model_evaluations.sql`
9. `2025_01_23_model_comparisons.sql`
10. `2026_01_06_ppm_mvp_schema.sql`
11. **`2026_05_07_stripe_webhook_idempotency.sql`** ← **must be run before
    the next deploy** that includes commit `c51ad6d` or later. The Stripe
    webhook now writes to `stripe_webhook_events`. If the table is
    missing the lookup fails open (handler still runs), so a missed
    migration will not drop revenue but will log
    `webhook_idempotency_lookup_error` warnings on every event.

---

## Stripe webhook configuration

Stripe → Developers → Webhooks → Add endpoint.

- **URL:** `https://strainspotter.app/api/stripe/webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

The handler is at-least-once safe (Stripe's words; ours by virtue of the
idempotency table from May 7 2026). It is also signature-verified — any
unsigned body returns 400.

---

## Stripe price IDs (current live)

These are hardcoded in `lib/stripe/config.ts`. If you change them in
Stripe, update the config in the same commit.

```
member:    price_1TK7uf2LVfewrTUsnHCdPsR9   ($4.99/mo · 100 scans)
pro:       price_1TK7uf2LVfewrTUsU1IO9cfL   ($9.99/mo · unlimited)
topup_10:  price_1TK7ug2LVfewrTUsFTd5HhlM   ($1.99 · +10 scans)
topup_25:  price_1TK7ug2LVfewrTUs4ajDAy8H   ($3.99 · +25 scans)
```

---

## Post-deploy smoke tests

After Vercel goes green on a deploy that touched billing or the gate:

1. **Anonymous health.** Open `https://strainspotter.app` in incognito.
   AgeGate appears, accepts a DOB ≥18, then redirects to
   `/garden/scanner`. The scanner-status row says "Subscribe to scan."
2. **Paywall on scan.** Tap Scan with a photo selected. The paywall
   modal appears, not a generic error.
3. **Subscriber path.** Sign in as a Member-tier test account. Same
   scan attempt actually runs. Vercel logs show:
   `{"level":"info","event":"scan_start","user":"…","tier":"member"}`
4. **Settings → Manage subscription** opens Stripe's hosted portal.
5. **Webhook idempotency.** Stripe → Developers → Events → pick a
   recent `checkout.session.completed` → Resend. The webhook returns
   `200 { received: true, idempotent: true }` and Vercel logs
   `webhook_idempotent_skip`.
6. **Privacy / terms** load: `/privacy` and `/terms` render the policy
   text (not a 404).
7. **Service worker.** DevTools → Application → Service Workers shows
   `sw.js` activated.
8. **Manifest.** DevTools → Application → Manifest shows the StrainSpotter
   emblem at all declared sizes; no missing-asset warnings.

---

## Rollback

`git revert <bad-sha>` then push. Vercel auto-deploys the revert.

For a fast page-by-page rollback: in Vercel, go to Deployments → previous
green deploy → "Promote to Production." This bypasses git and is the
right move during a payment-flow incident.

---

## Notes for App Store submission

See `docs/APP_STORE_LISTING.md` for the listing copy and reviewer notes.
See `docs/PRIVACY_MANIFEST_NOTES.md` for the iOS Capacitor wrap path.

The web app is ready to ship; the iOS binary is gated on the Capacitor
wrap step which has not been done yet.
