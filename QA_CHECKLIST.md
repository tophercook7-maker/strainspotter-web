# Manual QA Checklist

Use this list before each release/OTA to ensure critical flows still work. Record date/tester + any notes.

## 1. Auth & Onboarding
- [ ] Sign up with new email → verify verification email arrives.
- [ ] Sign in with existing account.
- [ ] Onboarding overlay + first-run intro screens display (Scan intro, AI context, CTA).
- [ ] Selecting **Enthusiast** dismisses overlay and “Start scanning” button routes to Scan page.
- [ ] Password reset link flows end-to-end.

## 2. Garden & Navigation
- [ ] Garden tiles open Scanner, Strain Browser, Groups, Shops, Seeds, Grow Coach, Grower Directory, Feedback.
- [ ] Bottom nav tabs (Garden / Scan / Groups / Shops / Growers) switch views without reloads.
- [ ] Credit pill updates after scan/top-up.

## 3. Pricing & Credits
- [ ] `BuyScansModal` loads packages from `/api/credits/packages`.
- [ ] App Unlock card shows $5.99 and disables after unlock.
- [ ] Membership card shows $4.99/mo + moderator discount badges.
- [ ] Top-up packs display 50/200/500 options with per-scan pricing.
- [ ] Credits indicator pill visible in nav and refreshes after scans.
- [ ] Low-balance warning (<5 scans) renders with CTA.
- [ ] Out-of-credits screen blocks scans and routes to buy/upgrade flow.
- [ ] API calls include Authorization header (confirm 401 when logged out).

## 4. Scan Flow
- [ ] Dedicated Scan page flow: Upload sample image → scan completes → credits decrement → Scan Result shows matches.
- [ ] When credits exhausted, ScanWizard shows new messaging (upgrade/top-up).
- [ ] “Log experience” launches journal dialog with prefilled strain info.
- [ ] Vision failure simulated (rename env) → graceful error + credit preserved.
- [ ] Analytics events (`scan_started`, `scan_completed`, `scan_failed`) appear in `/api/analytics/events/recent`.

## 5. Community & Messaging
- [ ] Groups list renders + DM pane toggles (Recent / All Users).
- [ ] Send message in group → appears for both participants.
- [ ] Report message → `/api/moderation/report` returns 200.

## 6. Dispensary Finder
- [ ] Location permission prompt works (web & mobile).
- [ ] Results filtered to cannabis-only; clicking opens Google Maps with place_id.
- [ ] Spinner clears when Places API times out.

## 7. Moderator / Admin Tools
- [ ] Moderator account can open Moderation Dashboard (triage tabs show counts).
- [ ] Resolve report (approve/warn/remove) hits `/api/moderation/reports/:id/resolve`.
- [ ] Moderator cannot access `/api/admin/errors/recent`.
- [ ] Admin can open Membership Admin + approve application.
- [ ] Admin can view Error Viewer (loads `/api/admin/errors/recent`).
- [ ] Admin Status/Debug page (Home → Status link) loads `/health`, `/api/health`, analytics summary and links out to Admin Errors + Moderation dashboard.

## 8. Error Logging
- [ ] Trigger synthetic client error → Error Boundary posts to `/api/admin/errors/client`.
- [ ] Error Viewer refresh shows new entry with client context.
- [ ] Backend throws handled error → entry appears in admin errors.
- [ ] Analytics events for auth/credits/journal appear in `/api/analytics/events/recent`.

## 9. Capacitor / OTA
- [ ] `npm run build && npx cap sync ios` updates assets.
- [ ] Dev hot-reload works when `CAP_DEV_SERVER=true`.
- [ ] Device build confirms API calls go to remote backend (not localhost).

## 10. Smoke Tests
- [ ] `/health` endpoint returns `{ ok: true }`.
- [ ] `/api/diagnostic/vision-test` (admin only) responds.
- [ ] `/api/analytics/events/summary` returns scan/journal metrics (admin token required).
- [ ] Backend Vitest suite (`npm run test`) passes.

Document any failures + fixes before signing off.


