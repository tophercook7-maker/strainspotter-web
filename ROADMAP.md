# StrainSpotter — Roadmap to Best-in-Market

> Goal: make StrainSpotter the most accurate, trusted, and defensible cannabis
> identification system on the market. Status legend: ⬜ not started · 🟡 in
> progress · ✅ done.

This roadmap is the single source of truth for the rebuild. It supersedes the
contradictory state described across the older root `*.md` docs (see Phase 0
"reconcile docs").

## Canonical source
- **Working copy:** `~/Desktop/strainspotter-web` (newest `main`, fullest pipeline).
- **Merge in:** unique work on `origin/recovery/docs-unique-work-2026-05-31`
  (data-engine, scraper pipeline, scan entitlements, Tauri desktop, SS UI kit).
- **Archive after merge:** `~/Documents/strainspotter-web`, `~/Projects/StrainSpotter`,
  Desktop `…LOCAL-BACKUP…` and OLD-BACKUP copies.

## The three moats (what "best on the market" means)
1. **Measured accuracy** — retrieve-then-rerank (image embeddings → VLM over real
   exemplars) + a published eval we gate on.
2. **Proprietary, rights-cleared data flywheel** — every confirmed user scan
   becomes owned, labeled, geo/lighting-diverse data competitors can't scrape.
3. **The honesty brand** — calibrated confidence, "not cannabis" detection,
   seller-claim validation, shareable "here's exactly what the AI saw" cards.

---

## Phase 0 — Foundation & cleanup  🟡
*Make the codebase safe to change before changing it.*
- ✅ Add CI quality gate (`.github/workflows/ci.yml`): typecheck + `vitest` block; lint non-blocking.
- ✅ Add `typecheck` / `test` / `test:watch` / `lint` npm scripts.
- ✅ Remove `typescript.ignoreBuildErrors` (now `false`; `tsc --noEmit` = 0 errors; `next build` validated). `strict: true` deferred — surfaces 57 errors to fix incrementally.
- 🟡 Money/auth-path tests: ✅ scan-gate entitlement, ✅ membership tier-collapse, ✅ `serverGate` subscription gate, ✅ Stripe price→tier mappers. ⬜ webhook **DB idempotency** (`stripe_webhook_events`) + IAP webhook.
- ✅ Consolidate: **no cherry-pick needed** — verified `main` already contains the embedding scanner code (`embeddingService`/`strainMatcher`/`hybridFusion`/`finalDecisionEngine`/`scanFusion`); it's just disconnected from `/api/scan`. The `recovery/docs-unique-work` branch is redundant for the core ID work. ⬜ archive the duplicate folders + recovery branch.
- ⬜ Reconcile/condense the ~28 root markdown docs into `docs/`; quarantine dead code.
- ⬜ Repo hygiene: stop tracking `tsconfig.tsbuildinfo`; iCloud "* 2.*" duplicate detritus (Desktop is iCloud-synced) keeps polluting local `.next` typechecks.

## Phase 1 — Identification engine (core differentiator)  ⬜
*Turn "honest guess" into measured, grounded accuracy.*
- 🟡 Eval harness built (`lib/scanner/scanAccuracy.eval.test.ts`, gated by `RUN_SCAN_EVAL`, paced + incremental for low-tier rate limits). **BASELINE (text-only GPT-4o, n=50 curated reference images / 27 strains): top-1 10%, top-3 14%.** Confidence uncalibrated (~59% stated even on wrong answers); over-predicts popular strains (white-widow/og-kush/gdp/gelato). Snapshot: `data/eval/baseline-textonly-2026-06-23.json`. ⬜ still need a clean held-out *user-photo* set + CI gate. **This 10% is the number Phase 1 must beat.**
- ⬜ Wire image-retrieval grounding into `/api/scan`: embed upload → ANN over reference embeddings → feed top-K reference **images + names** into the VLM call. The code already exists in `main` (`lib/scanner/{embeddingService,strainMatcher,hybridFusion,finalDecisionEngine}.ts`) but is disconnected — this is a *wiring* task. Start in-memory over `data/embeddings/strain-embeddings.json` (52 strains), move to **pgvector** as the reference library grows.
- ⬜ Two-stage retrieve-then-rerank; drop the full catalog from the prompt.
- ⬜ Calibrate confidence empirically (isotonic/Platt); remove fabricated range / indica-sativa ratio / "consensus strength".
- ⬜ Fix feedback persistence → Supabase (currently local `.jsonl`, lost on serverless); activate the learned re-ranker + reward flywheel.
- ⬜ Phenotype modeling (cluster reference images per strain).
- ⬜ Model strategy: provider/model abstraction with failover; benchmark current top VLMs.

## Phase 2 — Data moat & legal  ⬜
*Defensible, rights-cleared data.*
- ⬜ Resolve image licensing: quarantine scraped images to training-only; add user-contribution license grant to ToS.
- ⬜ User-contributed data flywheel (confirm/correct UX + rewards) → owned labeled images at scale.
- ⬜ Depth over breadth: fully verify the top ~500 commercial cultivars (lineage, terpenes, THC/CBD, human review); mark the 35k long tail as candidate.
- ⬜ Canonical strain resolution (collapse variant-name sprawl via alias graph).
- ⬜ Harden storage/provenance: finish Supabase mirror (off the `/Volumes/TheVault` single drive); immutable source/license/consent per row.
- ⬜ Explore data partnerships / licensed datasets.

## Phase 3 — Monetization (make it transact)  ⬜
- ⬜ Replace placeholder Stripe price IDs (annual, Founder, top-up-100); set `STRIPE_WEBHOOK_SECRET` + RevenueCat secrets.
- ⬜ Fix Founder lifetime oversell race condition (per-customer lock).
- ⬜ Post-checkout auto-login / account sync.
- ⬜ Apple IAP products (App Store Connect + RevenueCat); **Google Play Billing**.

## Phase 4 — Platform & retention  ⬜
- ⬜ Cloud-sync grow data (plants / grow-log / journal / favorites) off localStorage.
- ⬜ Android app: icons, keystore, Play Billing, build AAB, Play submission (+ policy-safe build).
- ⬜ iOS TestFlight (icon gen) → App Store.
- ⬜ Store-compliance feature flags for the "Partake" consumption content + dispensary finder; PWA + web-payments fallback.
- ⬜ Decide Tauri desktop: finish or remove.

## Phase 5 — Growth  ⬜
- ⬜ Shareable "here's exactly what the AI saw" result cards (viral honesty wedge).
- ⬜ Thin real community slice (replace "Coming v2.0").
- ⬜ Accessibility / WCAG AA pass on the glass UI.

---

## Needs the owner (blocks specific items)
- Accounts/keys: Google Play Developer ($25), Stripe live price IDs + webhook secret, RevenueCat keys, OpenAI / image-search keys (Apple Developer already held).
- Decisions: image-licensing approach, lawyer review of ToS + contribution consent, how aggressive to be on store-policy surfaces.

## Store-policy note (existential)
Apple & Google restrict cannabis apps that facilitate sale/use. Lead with web/PWA;
ship policy-safe native builds (flag off consumption/dispensary surfaces); keep a
direct-APK / PWA fallback. Plan around this from day one.
