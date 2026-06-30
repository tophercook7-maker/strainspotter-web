# Apple IAP Setup — StrainSpotter

End-to-end setup for the In-App Purchase pathway. Follow in order. The
code is already shipped (this session); these are the App Store Connect
+ RevenueCat + Supabase steps that have to happen OUTSIDE the codebase.

## Prerequisites

- [ ] Paid Apple Developer account ($99/yr) — required for IAPs.
- [ ] App Store Connect access with admin or app-manager role.
- [ ] Free RevenueCat account (free tier covers up to $2.5K MTR).
- [ ] Supabase service role key (for webhook → DB writes).

---

## 1. Apple App Store Connect — create the products

Go to **My Apps → StrainSpotter → Monetization → In-App Purchases**.
Create FIVE products. Product IDs must EXACTLY match what's in
`lib/iap/products.ts`:

### Subscriptions (Auto-Renewable)

Create a subscription group called **"StrainSpotter Membership"** first.
Then add each as an auto-renewable subscription within that group:

| Product ID                                            | Display Name        | Duration | Price (USD) |
| ----------------------------------------------------- | ------------------- | -------- | ----------- |
| `com.mixedmakershop.strainspotter.member.monthly`     | Member (Monthly)    | 1 month  | $4.99       |
| `com.mixedmakershop.strainspotter.pro.monthly`        | Pro (Monthly)       | 1 month  | $9.99       |

_Annual plans and the Founder Lifetime product were discontinued (Jun 2026).
Existing Founder customers keep access via the `founder` entitlement restore
path; the product is no longer offered for sale._

### Topups (Consumable)

| Product ID                                            | Display Name | Price (USD) |
| ----------------------------------------------------- | ------------ | ----------- |
| `com.mixedmakershop.strainspotter.topup.10`           | 10 Scans     | $2.99       |
| `com.mixedmakershop.strainspotter.topup.20`           | 20 Scans     | $4.99       |
| `com.mixedmakershop.strainspotter.topup.50`           | 50 Scans     | $9.99       |

For each product: fill out **Review Information** with screenshots and
a brief description. Apple holds purchases until each product is reviewed
the first time, so do this immediately rather than at submission.

---

## 2. RevenueCat dashboard

Sign up at https://app.revenuecat.com.

### Create the project

1. **Project → New Project** → name "StrainSpotter".
2. **Apps → New App → iOS** → bundle ID `com.mixedmakershop.strainspotter`.
3. Paste your **App Store Connect Shared Secret** (App Store Connect →
   Users and Access → Integrations → App Store Connect API).

### Configure products

For each Apple product ID from step 1, create a matching **Product** in
RevenueCat (Products → New Product). RevenueCat will mark each as
"detected from App Store" once it can read your App Store Connect data.

### Create Entitlements

Entitlements → New Entitlement. Create three:

| Entitlement ID | Products Attached                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `member`       | member.monthly                                                                                      |
| `pro`          | pro.monthly                                                                                         |
| `founder`      | _legacy — existing Founder customers only (restore path). No product sold; keep so past buyers retain elite._ |

### Create an Offering

Offerings → New Offering → "Default Offering". Add **Packages** within it:

- Member Monthly → member.monthly
- Pro Monthly → pro.monthly
- Topup 10 → topup.10
- Topup 20 → topup.20
- Topup 50 → topup.50

Mark this offering as **Current**.

### Get the iOS API key

Project Settings → API Keys → iOS → copy the **public** key (starts
with `appl_`). This goes in your `.env.local`:

```
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxx
```

### Configure the webhook

RevenueCat → Project → Integrations → Webhooks → Add Webhook:

- **URL**: `https://strainspotter.app/api/iap/webhook`
- **Authorization header**: `Bearer <SOMETHING_RANDOM_AND_LONG>`
  - Generate one with `openssl rand -hex 32`
  - Save the value in Vercel env as `REVENUECAT_WEBHOOK_AUTH_SECRET`
- Events to send: **All events** (the webhook handler ignores unknown types).

---

## 3. Supabase migration

Run BOTH migrations in the Supabase SQL editor against production:

```sql
-- 1. Pricing expansion (founder, training consent)
\i migrations/2026_05_25_pricing_expansion.sql

-- 2. Apple IAP columns
\i migrations/2026_05_25_apple_iap_columns.sql
```

These add `founder_purchase_at`, `training_consent*`,
`apple_original_transaction_id`, `apple_current_period_end` to `profiles`.

---

## 4. Vercel environment variables

Add these via Vercel → Settings → Environment Variables:

| Variable                              | Where to get it                          |
| ------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY`  | RevenueCat → Project → API Keys → iOS    |
| `REVENUECAT_WEBHOOK_AUTH_SECRET`      | `openssl rand -hex 32` (you generate it) |
| `STRIPE_PRICE_MEMBER_ANNUAL`          | Stripe Dashboard (new $39/yr price)      |
| `STRIPE_PRICE_PRO_ANNUAL`             | Stripe Dashboard (new $79/yr price)      |
| `STRIPE_PRICE_FOUNDER_LIFETIME`       | Stripe Dashboard (new $99 one-time)      |
| `STRIPE_PRICE_TOPUP_100`              | Stripe Dashboard (new $8.99 topup)       |

The existing Stripe price env vars (`STRIPE_PRICE_MEMBER`, etc.) keep
working — the new ones are additive.

---

## 5. Capacitor sync

After `npm install` pulls down `@revenuecat/purchases-capacitor`, sync
the native iOS project:

```bash
npx cap sync ios
```

This copies the RevenueCat SDK into the Xcode project and updates
`ios/App/Podfile`. Then open Xcode and let CocoaPods do its thing:

```bash
npx cap open ios
# In Xcode terminal:
cd ios/App && pod install --repo-update
```

### Enable the In-App Purchase capability in Xcode

1. Open the project in Xcode.
2. Select the **App** target → **Signing & Capabilities** tab.
3. Click **+ Capability** → **In-App Purchase**.
4. (Optional but recommended) Add **Sign In with Apple** capability so
   users on iOS can create accounts with Apple ID instead of email.

### StoreKit configuration file (for local testing)

Add `StoreKitConfig.storekit` to the Xcode project so you can simulate
purchases without TestFlight. Right-click the App folder → New File →
StoreKit Configuration File. Add each product ID from step 1. Set
**Editor → Scheme → Edit Scheme → Run → Options → StoreKit Configuration**
to this file. Now `Product.products(for:)` returns your products in the
simulator.

---

## 6. Testing

### Sandbox testers

App Store Connect → Users and Access → Sandbox Testers → New Tester.
Create at least one. Use this account on a physical iOS device for the
end-to-end test (sandbox doesn't work fully in the Simulator).

### Test flow

1. Sign out of your Apple ID on the test device. Don't sign in to your
   real one — App Store will pop a sign-in sheet using the sandbox
   account when you tap "Subscribe".
2. Open the StrainSpotter app, sign in to your Supabase account.
3. Tap a paywall CTA. The system purchase sheet should appear.
4. Approve the purchase. The Capacitor wrapper sends the receipt to
   RevenueCat, which sends a webhook to `/api/iap/webhook`, which
   updates `profiles.membership`.
5. Confirm the tier badge changes in the UI within ~5 seconds.
6. Use the **Restore Purchases** link to verify the restore flow works.
7. Repeat with a topup; confirm `profiles.scans_remaining` increments.

### Verify the webhook fired

Supabase SQL editor:

```sql
SELECT event_id, event_type, created_at
  FROM stripe_webhook_events
 WHERE event_id LIKE 'rc_%'
 ORDER BY created_at DESC
 LIMIT 5;
```

You should see `rc_<rc-event-id>` rows with types like
`revenuecat.initial_purchase`.

---

## 7. Pre-submission checklist for App Store review

- [ ] In-App Purchase capability enabled in Xcode.
- [ ] Restore Purchases button visible on the paywall (rendered on iOS).
- [ ] App description and screenshots clearly explain what each
      subscription unlocks. Apple rejects vague pricing.
- [ ] Privacy Policy URL is set and lists in-app purchase data.
- [ ] App Review Information notes:
      - Sandbox tester credentials
      - Instructions to find the paywall (e.g. "Tap Scanner → tap any photo")
      - Note that restoring is supported
- [ ] Subscription terms shown to the user before purchase
      (Apple now enforces this — the paywall must show the price,
      duration, and what auto-renews).

---

## What lives where in code

| Concern                  | File                                             |
| ------------------------ | ------------------------------------------------ |
| Platform detection       | `lib/platform.ts`                                |
| Product IDs / mappings   | `lib/iap/products.ts`                            |
| RevenueCat client wrapper| `lib/iap/revenueCatClient.ts`                    |
| Purchase routing (any platform) | `lib/iap/purchaseRouter.ts`               |
| Paywall UI               | `components/ScanPaywall.tsx`                     |
| Webhook → Supabase       | `app/api/iap/webhook/route.ts`                   |
| DB migration             | `migrations/2026_05_25_apple_iap_columns.sql`    |
| Auth lifecycle integration | `lib/auth/AuthProvider.tsx`                    |

---

## Common gotchas

- **"The App Store offering isn't available"** at runtime — usually
  means RevenueCat doesn't see your App Store Connect Shared Secret,
  OR you haven't marked the offering as "Current" in the dashboard.
- **Sandbox auto-renewals are FAST** (~5 mins for monthly, ~1 hour for
  annual). Useful for testing renewal handling but disorienting first time.
- **Apple "Family Sharing"** complicates founder lifetime — a family
  member can inherit the entitlement. RevenueCat handles this
  automatically; you don't need to do anything, just be aware.
- **Sandbox vs production webhook events** — both fire. The handler
  drops sandbox events when `NODE_ENV=production` to avoid sandbox
  data polluting prod metrics.
