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
- 🟡 Consolidate to one repo: merge `recovery/docs-unique-work` into `main`; archive duplicates.
- 🟡 Add CI quality gate: `npm ci` → lint → `tsc --noEmit` → `vitest run` on PRs.
- 🟡 Add `test` and `typecheck` npm scripts.
- ⬜ Remove `typescript.ignoreBuildErrors: true` (after fixing legacy type errors); move toward `strict: true`.
- ⬜ Add tests for the money/auth paths (Stripe + IAP webhooks, `serverGate`, scan quota).
- ⬜ Reconcile/condense the ~28 root markdown docs into `docs/`; quarantine dead code.
- ⬜ Repo hygiene: gitignore/untrack `tsconfig.tsbuildinfo`, `.next/`, temp files.

## Phase 1 — Identification engine (core differentiator)  ⬜
*Turn "honest guess" into measured, grounded accuracy.*
- ⬜ Build an eval harness + labeled holdout (≥30 strains × ≥20 photos); baseline the production model. Gate accuracy in CI.
- ⬜ Wire image-retrieval grounding into `/api/scan`: embed upload → pgvector ANN in Supabase → feed top-K reference **images + names** into the VLM call. (Connect the already-written `lib/scanner/{embeddingService,strainMatcher,hybridFusion}.ts`.)
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
