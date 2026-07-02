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
- 🟡 Image-retrieval grounding — **A/B run, did NOT beat baseline** (leave-one-out, n=20: retrieval-only top1 0%/top3 20%; ungrounded top1 5%; grounded top1 0%/top3 20% — grounding even broke `durban-poison`). Snapshot: `data/eval/grounding-ab-2026-06-24.json`, harness `lib/scanner/retrievalGrounding.eval.test.ts`. **Finding: the bottleneck is retrieval quality (CLIP-base = 0% top-1 over noisy web refs), not the wiring.** Feeding a weak shortlist anchors the VLM to wrong candidates.
- ✅ Experiment #1 — **feed reference images** (query high-detail, refs low-detail), A/B n=11 (`data/eval/image-grounding-ab-2026-06-24.json`, harness `lib/scanner/imageGrounding.eval.test.ts`): **top-3 9%→27%, top-1 flat (9%).** Helped (unlike name-grounding) and visually rescued cases (e.g. afghan-kush), BUT **capped by retrieval recall — the correct strain was only in the top-K shortlist 45% of the time.** Image grounding is worth keeping; it can't lift top-1 until retrieval recall improves.
- ⬜ **THE lever (now evidence-backed): retrieval recall.** Top-1 is gated by whether the right strain is even in the shortlist (45% today). Fix, in order: (1) stronger embedding model — SigLIP / larger or fine-tuned CLIP / OpenAI image embeddings (raise recall); (2) more + cleaner reference images per strain = **Phase 2 data moat**; (3) keep image grounding on top. Re-run the A/B after each. Move to **pgvector** once recall is worth scaling.
- Three-experiment summary: baseline (text, n=50) 10%/14% · name-grounded (n=20) 0%/20% · image-grounded (n=11) 9%/27%.
- ⬜ Two-stage retrieve-then-rerank; drop the full catalog from the prompt.
- 🟡 Calibrate confidence empirically. ✅ **Calibration engine shipped** (flag `SCANNER_CALIBRATION=1`, default off): `lib/scanner/calibration.ts` + versioned table `lib/scanner/calibrationTable.json` fit by `npm run scanner:calibrate` (Bayesian-shrunk empirical accuracy + PAVA monotone pooling; evidence-anchored, not false-precision isotonic on n=50). Two strata by `matchSignals.nameInImage`: visualOnly **fit** (raw 0–79 → true ~8%, "80+" → 36%), nameInImage **declared prior** (pending flywheel labels). Applied as a route-level presentation transform in `/api/scan` (raw kept as `modelConfidence`); kept out of `normalizeAnalysis` so evals still measure raw. Doc + reliability table: `docs/scanner-calibration.md`. ✅ **Removed live fabricated fields**: the `confidence±` range (now shows the single calibrated point in the history/`WikiStyleResultPanel` view), the invented `consensusStrength` (v2 is one vision call — no consensus vote, set 0), and the dead `indicaPct`/`sativaPct`=50 default (scanner page). Legacy hybrid-engine internals (`consensusEngine`/`confidenceExplanation` hardcoded ranges) are dead in the v2 path and left as-is. ⬜ still: flip flag to default after verify; re-fit `nameInImage` from `scan_corrections`.
- ⬜ Fix feedback persistence → Supabase (currently local `.jsonl`, lost on serverless); activate the learned re-ranker + reward flywheel.
- ⬜ Phenotype modeling (cluster reference images per strain).
- ⬜ Model strategy: provider/model abstraction with failover; benchmark current top VLMs.

## Phase 2 — Data moat & legal  ⬜
*Defensible, rights-cleared data.*
- ⬜ Resolve image licensing: quarantine scraped images to training-only; add user-contribution license grant to ToS.
- ⬜ User-contributed data flywheel (confirm/correct UX + rewards) → owned labeled images at scale.
- ✅ **10,000-strain catalog built** (`data/strains-10k.json`, quality-ranked from the 35k via `scripts/build-10k-catalog.mjs` / `npm run catalog:build-10k`; 46% known type, 29% effects, curated 314 included). Typed loader + `resolveStrain()` in `lib/data/catalog10k.ts`. ✅ `resolveStrain` **wired into `/api/scan`** — candidates now carry `catalogSlug`/`inCatalog` (links a scan result to the library page; canonicalizes names). ✅ **Library/search already has 35,796 strains** in the Supabase `strains` table (rich schema: type/THC/CBD/effects/lineage/breeder/images) — the "314" was only the scanner's *prompt* catalog, never the library, so no seeding was needed.
- 🟡 **Free-naming A/B** (`data/eval/free-naming-ab-2026-06-24.json`): dropping the 314 catalog from the prompt + resolving the model's free answer to the 10k = **accuracy-neutral (5%/5% both, n=20)** BUT removes ~10k tokens/scan (≈half the cost), eases rate limits, and lets the scanner name 10k+ strains. **Recommended adoption** (cost/coverage win, neutral accuracy) — behind a flag, then make default. ⬜ wire it into `/api/scan`.
- ⬜ Depth over breadth: fully verify the top ~500 commercial cultivars (lineage, terpenes, THC/CBD, human review); mark the rest as candidate. **Reminder: 10k *names* ≠ 10k *identifiable* — identification still needs reference images per strain (the recall bottleneck from Phase 1).**
- **4-experiment summary (all paid evals, ~$3.50 of $20):** baseline text-only 10%/14% (n=50) · name-grounded 0%/20% (n=20) · image-grounded 9%/27% (n=11) · free-naming 5%/5% = constrained (n=20). **Consistent conclusion: prompt/wiring changes don't move top-1; the lever is retrieval recall + reference-image data.**
- ⬜ Canonical strain resolution (collapse variant-name sprawl via alias graph).
- ⬜ Harden storage/provenance: finish Supabase mirror (off the `/Volumes/TheVault` single drive); immutable source/license/consent per row.
- ⬜ Explore data partnerships / licensed datasets.

## Phase 3 — Monetization (make it transact)  ⬜
- ⬜ Replace placeholder Stripe price IDs (annual, Founder, top-up-100); set `STRIPE_WEBHOOK_SECRET` + RevenueCat secrets.
- ✅ Founder oversell race fixed — `/api/stripe/checkout` enforces the 1,000 cap with a LIVE count (`lib/billing/founder.ts`, fail-closed on DB error so it can't oversell); counter route refactored to share it; 4 tests. (Residual: ~concurrent buyers at the very last slot — acceptable; true zero-race needs a DB reservation.)
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
