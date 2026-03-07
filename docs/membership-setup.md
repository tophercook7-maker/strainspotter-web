# Membership setup: production-ready checklist

This guide gets your StrainSpotter Club membership working end-to-end with App Store / Play billing verification and Try Me limits.

## 1) Link to the Supabase project

If CLI linking fails, you can complete all steps in the Supabase Dashboard:
- Open your project (ref: rdqpxixsbqcsyfewcmbz)
- Go to: Project Settings → API and Functions

## 2) Add Function Secrets (Dashboard)

Navigate: Project Settings → Functions → Secrets → New secret. Add the following key/value pairs using your real credentials:
- APPLE_ISSUER_ID
- APPLE_KEY_ID
- APPLE_PRIVATE_KEY (paste entire PEM with BEGIN/END lines)
- APPLE_BUNDLE_ID (e.g., com.strainspotter.app or your actual bundle ID)
- GOOGLE_SERVICE_ACCOUNT_JSON (the full JSON string)
- GOOGLE_PACKAGE_NAME (e.g., com.strainspotter.app)

After saving, redeploy Edge Functions so they can read the new secrets.

## 3) Verify-Subscription function

- The backend will upgrade `verify-subscription` to validate receipts/tokens and upsert memberships.
- You don’t need to pass sensitive keys from the client—only the purchase token/receipt from Apple/Google.

Expected response shape on success:
```
{ "status": "active", "membership": "club" }
```

## 4) Try Me limits

- The `try-me` Edge Function enforces 2 trial scans for non-members.
- The frontend also tracks a local fallback counter to keep the UI in sync.

## 5) Frontend wiring

- Use `frontend/src/lib/membership.js` and `frontend/src/hooks/useMembership.js` to:
  - Show CTA text (Try Me remaining vs Scan now for members)
  - Call `try-me` for trial scans
  - Call `verify-subscription` after purchase to upgrade membership
- Drop `ScanCTA` where you currently present a scan entry point.

## 6) Definition of Done

- Secrets present in Supabase and Edge Functions redeployed
- `verify-subscription` returns membership: club on valid purchase
- Try Me blocks at 2, with clear prompt to join Club
- Members can scan without limits in web and mobile
- QA pass: all navigation, groups, chat, and error states verified

## 7) Hand-off signals

- Once secrets are saved, let the backend know by replying: "secrets set"
- They’ll finish the `verify-subscription` validation and membership upsert.
