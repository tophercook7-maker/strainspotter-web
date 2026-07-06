# App-store compliance strategy

Apple App Store and Google Play restrict apps that **facilitate the sale or use
of cannabis**. The web/PWA is not bound by those rules. StrainSpotter ships one
codebase to all three, gated by a single build flag.

## The strategy

- **Web / PWA (default, current production):** every feature on, Stripe web
  payments on. No change — this is what strainspotter.app serves today.
- **iOS / Android native builds:** hide the surfaces that read as "facilitating
  sale/use," and defer digital payments to the store's own billing.

## The one switch

`NEXT_PUBLIC_STORE_BUILD` = `web` (default) | `ios` | `android`.

All gating decisions live in **`lib/storeCompliance.ts`** — a single `compliance`
object. Change policy in one file, not app-wide.

| Feature flag        | Web | iOS/Android | Why gated |
|---------------------|-----|-------------|-----------|
| `dispensaryFinder`  | ✅  | ❌          | Maps users to places selling cannabis |
| `seedVendors`       | ✅  | ❌          | Links out to buy seeds |
| `consumptionDiary`  | ✅  | ❌          | Logs dose/method/effects (use) |
| `webPayments`       | ✅  | ❌          | Native stores force their own billing (IAP/Play) |

Strain ID, Plant Doctor, the library, grow tools, and community are **not**
gated — they're educational/utility and store-safe.

## How it's wired

- **Pages:** `components/ComplianceGate.tsx` wraps the sensitive routes
  (`dispensaries`, `seed-vendors`, `journal` layouts). On web it's a pass-through;
  in a gated native build it renders an "open on the web" fallback.
- **Navigation:** the garden hub (`app/garden/page.tsx`) filters its feature
  tiles + quick-links through `HIDDEN_HREFS`, so gated surfaces don't appear.
- **Payments:** when `webPayments` is off, route purchases through
  RevenueCat → StoreKit/Play Billing (the `/api/iap/webhook` path already exists;
  RevenueCat wiring is deferred until a native build ships — see ROADMAP Phase 3).

## Testing a native build locally

```bash
NEXT_PUBLIC_STORE_BUILD=ios npm run build && npm start
# dispensaries / seeds / journal now show the web fallback;
# their hub tiles disappear. Set back to web (or unset) to restore.
```

## Guarantee

Because the flag **defaults to `web`**, the live site and PWA are unaffected until
a native build explicitly opts in. This is native-readiness, shipped ahead of the
native build — zero production impact today.
