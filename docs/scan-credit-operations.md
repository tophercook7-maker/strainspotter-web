# Scan Credit Operations Playbook

Updated November 2025 – describes the hybrid starter / membership / top-up credit system that now gates Vision scans.

## Credit Lifecycle

| Audience | Bundle | Quantity | Reset behaviour | Notes |
|----------|--------|----------|-----------------|-------|
| App purchase (starter) | Starter bundle | `SCAN_STARTER_BUNDLE` (20 default) | Expires **3 days** after the first grant or top-up | Kicks in automatically the first time we see a profile with no credits. |
| Garden members | Monthly bundle | `SCAN_MEMBERSHIP_BUNDLE` (30 default) | Resets every `SCAN_BUNDLE_RESET_DAYS` (30 default) once the user has an active membership record | Members can still buy top-ups; monthly bundle refresh happens lazily when they consume or request a summary. |
| Comped moderators | Moderator bundle | `SCAN_MODERATOR_BUNDLE` (15 default) | Same cadence as members | Comped memberships are still “active” but intentionally receive fewer free scans; they can top up like everyone else. |
| Store top-ups | IAP bundle | Defined per SKU (10/20/50/100 suggested) | Adds credits and **extends** the 3‑day window from the time of redemption if the user is not a member | Frontend nags non-members and reminds them the clock resets each time they top up. |

When the 3‑day non-member window expires we hard block scans in the backend (`consumeScanCredits` returns `STARTER_WINDOW_EXPIRED`). Credits are left in place so support can manually extend or convert the user later.

## Key Environment Flags

Set these in the backend environment (`env/.env.local`, Vercel, etc.):

```
SCAN_STARTER_BUNDLE=20           # first-time credits
SCAN_STARTER_DAYS=3              # non-member access window
SCAN_MEMBERSHIP_BUNDLE=30        # monthly refill for full members
SCAN_MODERATOR_BUNDLE=15         # monthly refill for comped moderators
SCAN_BUNDLE_RESET_DAYS=30        # membership refill cadence
SCAN_TOPUP_SECRET=super-secret   # shared secret for /api/scans/credits/grant
```

Changing the bundle amounts only affects future resets / grants; existing balances remain untouched.

## Backend Touchpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/scans/credits?user_id=UUID` | GET | Returns `{ credits, membershipActive, accessExpiresAt, starterExpired, trialDaysRemaining }` | Requires the user ID. Frontend passes the Supabase user id. |
| `/api/scans/credits/grant` | POST | Manual/IAP grant. Body `{ user_id, amount, reason?, metadata?, secret }` | `secret` must match `SCAN_TOPUP_SECRET`. Used by mobile receipt validation or ops. |
| `grant_moderator_comp_membership(p_user_id)` | SQL function | Automatically activates comped moderator membership | Triggered by moderator automation; keeps their status aligned. |

Refunds are automatic: if Vision fails after consuming a credit we credit the user back with `scan-refund`.

## Moderator & Membership Workflow

1. **Moderator perks** – when `comped_reason = 'grower-moderator'` they receive the moderator bundle size. Remove the comp flag to drop them back to starter rules.
2. **Monthly refresh** – `ensureMonthlyBundle` runs on each credit consume or summary call. No cron job is required, but you can trigger it manually in scripts if needed.
3. **Manual top-up** – run:

   ```bash
   curl -X POST "$API_BASE/api/scans/credits/grant" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "UUID",
       "amount": 20,
       "reason": "support-grant",
       "metadata": {"ticket": "SUP-1234"},
       "secret": "'$SCAN_TOPUP_SECRET'"
     }'
   ```

   Follow up with a GET to `/api/scans/credits` to confirm the balance and window.

4. **Starter expiry** – Support can either (a) run the grant flow above, (b) activate a real membership, or (c) let the user lapse. Expiry message now surfaces in the frontend and blocks processing.

5. **Audit trail** – Every change (starter grant, monthly reset, top-up, refund) writes to `scan_credit_transactions`. Use it to investigate disputes or duplicate charges.

## Frontend UX Summary

- Garden dashboard shows current credits, membership status, and countdown.
- Scanner gate:
  - Prompts login, shows credit card, and opens a top-up dialog.
  - Blocks uploads with clear messaging once the 3-day window closes.
  - Repeats the monthly membership benefits inside the dialog to “nudge” conversions.

## TODO / Integrations

- **Apple & Google receipt validation** – mobile clients should call `/api/scans/credits/grant` after verifying receipts server-side. The shared secret prevents random web clients from minting credits.
- **Scheduled tune-up** – consider a nightly job that runs `ensureMonthlyBundle` against all active members so their counters stay fresh even if they do not scan that month.
- **Usage reporting** – export from `scan_credit_transactions` into the pipeline dashboard for finance.

Keep this document up to date as the product team tweaks pack sizes or pricing.

## Granting Lifetime Owner / Moderator Access

Run the provisioning script whenever you need to give someone the same always-on access as the founding team. It creates (or updates) the Supabase auth user, marks them as a Garden owner/admin, grants a comped membership, and inserts them into the `moderators` table so all moderator tooling lights up automatically.

```bash
cd backend
node scripts/grant_owner_access.js \
  --email new.owner@example.com \
  --username newowner \
  --password KING123 \
  --role owner   # or --role admin
```

If the user did not exist yet, the script prints a generated password—share it securely and ask the owner to sign in and change it. Re-running the command for the same email is safe; it simply refreshes metadata, keeps the membership active, and reaffirms moderator status.
