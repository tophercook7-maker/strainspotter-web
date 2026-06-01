# Google Play IAP Setup — StrainSpotter

End-to-end setup for the Android In-App Purchase pathway. Mirror of
`docs/APPLE_IAP_SETUP.md` — same RevenueCat code, different store.
Follow in order. The code already supports Android via the same
`@revenuecat/purchases-capacitor` SDK; these are the Play Console +
RevenueCat + Capacitor steps that have to happen OUTSIDE the codebase.

## Prerequisites

- [ ] **Google Play Developer account** ($25 one-time fee).
- [ ] **Google Cloud project** (created automatically when you make the
      Play Developer account) — needed for the service account.
- [ ] **An Android device** (or emulator) with Google Play Services for
      end-to-end testing.
- [ ] RevenueCat project already created (see Apple doc step 2 — same
      project handles both stores).
- [ ] Supabase IAP migrations already applied (done — `apple_*` columns
      double as `iap_*` since RevenueCat normalizes the transaction id).

---

## 1. Create the Android project in Capacitor

This is a one-time setup. From the repo root:

```bash
npx cap add android
```

This creates the `android/` directory (mirror of `ios/`). It's added to
the repo so you can commit native config changes.

Then in Android Studio:

```bash
npx cap open android
```

In the project view, open `android/app/build.gradle`:

- Verify `applicationId "com.mixedmakershop.strainspotter"` matches your
  Apple bundle ID (they're traditionally the same).
- Set `versionCode` (an int, starts at 1) and `versionName` (the
  display string, e.g. `"1.0.0"`).

Sync gradle. Build → Build Bundle(s) / APK(s) → Build Bundle (`.aab`).
You'll need a signed AAB to upload to Play Console — see step 4 for
signing.

---

## 2. Google Play Console — list the app and create a track

Go to https://play.google.com/console.

### Create the app

**All apps → Create app**.

| Field                      | Value                                      |
| -------------------------- | ------------------------------------------ |
| App name                   | StrainSpotter                              |
| Default language           | English (United States)                    |
| App or game                | App                                        |
| Free or paid               | Free                                       |
| Declarations               | Confirm both: ad disclosure, content rating|

### Set up the app listing

Sidebar → **Grow → Store presence → Main store listing**. Fill out:

- Short description (80 chars)
- Full description (4000 chars)
- App icon (512×512 PNG, no transparency)
- Feature graphic (1024×500 PNG)
- Screenshots (at least 2; ideally 4–8)
- Privacy policy URL (Google requires this if you have IAP)

### Create a closed testing track

You can't ship IAPs without at least one approved release. Use a closed
track for initial testing:

Sidebar → **Test and release → Closed testing → Create new track**.

- Name: "alpha"
- Email list testers: Add at least one Gmail account you control
- Upload the signed AAB from step 1 (see signing below)
- Submit for review → wait ~24–72 hours for first approval

Once "alpha" is approved, IAPs become testable on the listed Gmail
accounts via the Play Store app (search for StrainSpotter, accept the
testing invite).

---

## 3. Sign the AAB (one-time)

Google Play requires upload-signed AABs. In Android Studio:

1. **Build → Generate Signed Bundle / APK** → AAB.
2. Click **Create new keystore**. Pick a path (save it somewhere
   backed up — losing it locks you out of updates).
3. Set strong password, alias (e.g. `strainspotter`), validity 25+ years.
4. Pick "release" build variant. Click finish.

This produces `app-release.aab` in `android/app/release/`.

**Critical:** also enable **Play App Signing** in the Play Console:
**Setup → App integrity → App signing → Use Play App Signing**.
Lets Google handle the signing key on Play's side and gives you key
rotation safety.

---

## 4. Create the In-App Products in Play Console

Sidebar → **Monetize → Products**. Product IDs MUST match what's in
`lib/iap/products.ts` (same as iOS — RevenueCat unifies them, so the
client code is identical across platforms).

### Subscriptions

Sidebar → **Monetize → Subscriptions → Create subscription**. Do this
four times. Then within each, click "Add a base plan" to set the price.

| Product ID                                            | Base plan ID    | Billing period | Price (USD) |
| ----------------------------------------------------- | --------------- | -------------- | ----------- |
| `com.mixedmakershop.strainspotter.member.monthly`     | `monthly`       | 1 month        | $4.99       |
| `com.mixedmakershop.strainspotter.member.annual`      | `annual`        | 1 year         | $39.00      |
| `com.mixedmakershop.strainspotter.pro.monthly`        | `monthly`       | 1 month        | $9.99       |
| `com.mixedmakershop.strainspotter.pro.annual`         | `annual`        | 1 year         | $79.00      |

Google requires base plan IDs to be unique within each subscription, so
just use "monthly" and "annual" as conventional names.

After creating each base plan, click **"Activate"**.

### One-time products

Sidebar → **Monetize → Products → In-app products → Create product**.

| Product ID                                            | Type          | Price (USD) |
| ----------------------------------------------------- | ------------- | ----------- |
| `com.mixedmakershop.strainspotter.founder.lifetime`   | Non-consumable| $99.00      |
| `com.mixedmakershop.strainspotter.topup.10`           | Consumable    | $0.99       |
| `com.mixedmakershop.strainspotter.topup.25`           | Consumable    | $2.49       |
| `com.mixedmakershop.strainspotter.topup.100`          | Consumable    | $8.99       |

For each: activate it. The "Founder Lifetime" must be **non-consumable**
(can't be repurchased); top-ups must be **consumable** (can be bought
many times).

---

## 5. Set up the Google service account (lets RevenueCat verify purchases)

RevenueCat needs read-only access to your Play Console to verify
purchases server-side.

### a. Create the service account

In **Google Cloud Console** (the GCP project linked to your Play
Developer account):

1. **IAM & Admin → Service Accounts → + Create Service Account**.
2. Name it `revenuecat-play-verifier`. No roles needed (you'll grant
   permissions in Play Console instead).
3. Click **Manage keys → Add key → Create new key → JSON**. Download
   the JSON file. Keep it secret.

### b. Grant access in Play Console

In Play Console: **Setup → API access**.

1. Click **Link** next to the Google Cloud project where you created
   the service account.
2. Under "Service accounts" find the one you just made.
3. Click **Grant access**.
4. Permissions: enable **View financial data, orders, and cancellation
   survey responses** + **Manage orders and subscriptions** for this app.
   No other permissions needed.
5. Save.

### c. Add to RevenueCat

In RevenueCat (https://app.revenuecat.com → your project):

1. **Apps → New App → Google Play** → application ID
   `com.mixedmakershop.strainspotter`.
2. Paste the contents of the service-account JSON into the "Google
   Service Credentials" field.
3. RevenueCat verifies the connection and starts seeing your products
   within a few minutes.

---

## 6. RevenueCat product + entitlement mapping (Android)

In RevenueCat's product list, you should now see entries for each
Android product (RevenueCat picked them up from Play Console once the
service account was linked).

The entitlements you already created for iOS (`member`, `pro`,
`founder` — see Apple doc step 2) work cross-platform: attach each
Android product to the same entitlement as its iOS counterpart.

| Android product                       | Entitlement(s)   |
| ------------------------------------- | ---------------- |
| `member.monthly` / `member.annual`    | `member`         |
| `pro.monthly` / `pro.annual`          | `pro`            |
| `founder.lifetime`                    | `pro` + `founder`|
| `topup.10` / `topup.25` / `topup.100` | *(none — credits granted by webhook)*|

In the existing Offering (you marked one "Current" in the Apple setup):
each Package already has the iOS product; under the Package, click
"Edit" and add the Android product to the same package. RevenueCat
now serves the right product per platform automatically.

---

## 7. Get the Android API key + add to env

RevenueCat → **Project Settings → API Keys → Google Play**.

Copy the **public** key (starts with `goog_`). Add to your env files:

```
NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxx
```

Add the same to **Vercel → Settings → Environment Variables** for both
Preview and Production environments.

`lib/iap/revenueCatClient.ts` already picks the right key per platform
via `isAndroid()` (you can grep for it to verify).

---

## 8. Capacitor sync for Android

After the steps above, sync the native Android project so it includes
the RevenueCat SDK:

```bash
npx cap sync android
```

This updates `android/app/build.gradle` to include the RevenueCat
dependency. Open Android Studio and let Gradle resolve:

```bash
npx cap open android
```

In Android Studio: **File → Sync Project with Gradle Files**.

### Android Manifest billing permission

Open `android/app/src/main/AndroidManifest.xml` and verify this line
exists inside `<manifest>`:

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

If not, add it. Without it, the Play Billing library can't open the
purchase sheet.

---

## 9. Testing

### Add yourself as a license tester

Play Console → **Setup → License testing** → add the Gmail account
you'll use to test. License testers can purchase IAPs at $0 cost (or
with the visible price, charged + refunded automatically).

### Install via the alpha track

1. On a real Android device, sign in with the Gmail account you added
   as a license tester AND as a closed-track tester (step 2).
2. Visit the opt-in link from Play Console → Closed testing → "Copy
   link". Tap "Become a tester".
3. Install StrainSpotter via the Play Store.

### Test flow

1. Open the app and sign in to your Supabase account.
2. Tap a paywall CTA. The Play Billing sheet should appear with your
   real product names + prices (or $0 for license testers).
3. Approve the purchase. The Capacitor wrapper sends the receipt to
   RevenueCat, which calls `/api/iap/webhook`, which updates
   `profiles.membership` (and `apple_original_transaction_id` — yes, the
   column name is misleading; RevenueCat normalizes both stores into
   one transaction id and we reuse the same column).
4. Confirm the tier badge changes in the UI within ~5 seconds.
5. **Test the Restore Purchases path** — Google requires this be
   accessible from a visible UI element.

### Verify the webhook fired

Same SQL query as the Apple flow — RevenueCat events have
`rc_` prefixed event IDs whether they're Android or iOS:

```sql
SELECT event_id, event_type, app_user_id, created_at
  FROM stripe_webhook_events
 WHERE event_id LIKE 'rc_%'
 ORDER BY created_at DESC
 LIMIT 5;
```

---

## 10. Pre-submission checklist for Google Play review

- [ ] Closed track has at least one approved release.
- [ ] Privacy policy URL set (Google blocks IAP without one).
- [ ] All IAP products marked "Active" in Play Console.
- [ ] Service account linked + RevenueCat sees products.
- [ ] Sample app screen-recording showing the purchase flow → request
      from Google during the IAP setup review (uncommon but happens).
- [ ] App content rating questionnaire completed
      (Setup → Policy and programs → App content).
- [ ] Data safety form completed
      (Setup → Policy and programs → App content → Data safety).
- [ ] Target API level meets the current Play requirement
      (currently API 34 / Android 14 for new uploads).

Once those are green, promote your closed-track release to production
under **Production → Create new release**.

---

## What lives where in code (same as Apple)

| Concern                  | File                                             |
| ------------------------ | ------------------------------------------------ |
| Platform detection       | `lib/platform.ts` (`isAndroid()`)                |
| Product IDs / mappings   | `lib/iap/products.ts`                            |
| RevenueCat client wrapper| `lib/iap/revenueCatClient.ts`                    |
| Purchase routing         | `lib/iap/purchaseRouter.ts`                      |
| Paywall UI               | `components/ScanPaywall.tsx`                     |
| Webhook → Supabase       | `app/api/iap/webhook/route.ts`                   |
| Auth lifecycle           | `lib/auth/AuthProvider.tsx`                      |

---

## Common gotchas

- **"Item not available for purchase"** on first test — almost always
  means the license-test account isn't on the alpha track yet, OR the
  product is "Inactive". Both have to be true.
- **Sandbox vs production webhook events** — Google fires real events
  during license testing too, with `is_sandbox: true`. The handler
  drops sandbox events when `NODE_ENV=production` to avoid sandbox
  data polluting prod metrics. Same as iOS.
- **Google reviews IAPs separately** — even after the app is approved,
  if you add a new product or change a price, it can take 24h before
  it's purchasable.
- **Family sharing** — Google calls it "Family Library". Behaves
  similarly to Apple's Family Sharing; RevenueCat handles it.
- **No proration on plan changes during testing** — Google's Play
  Billing has weird proration math for upgrades/downgrades. Use the
  real-world test (cancel + repurchase) instead of relying on prorate
  during alpha.

---

## Doing both stores at once

If you're shipping iOS and Android in parallel:

1. Apple App Store Connect products (done in iOS doc, step 1).
2. Google Play Console products (this doc, step 4).
3. Both share the same RevenueCat project, products, entitlements,
   offering, and webhook.
4. Both `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` and
   `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` set in env.
5. `revenueCatClient.ts` picks the right one at runtime via
   `isIOS()` / `isAndroid()`.
6. The webhook handler is platform-agnostic — RevenueCat normalizes
   `transaction_id`, `original_transaction_id`, etc. across stores.

Result: one codebase, one paywall component, one webhook, two stores.
