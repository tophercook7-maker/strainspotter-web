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
- 🟡 Money/auth-path tests: ✅ scan-gate entitlement, ✅ membership tier-collapse, ✅ `serverGate` subscription gate, ✅ Stripe price→tier mappers. ✅ webhook **DB idempotency** (`stripe_webhook_events`) for both Stripe + IAP — hardened to **claim-before-process** (atomic PK insert as the gate + release-on-failure), closing the check-then-record TOCTOU race where concurrent redeliveries could double-apply (e.g. double top-up credits). Residual: top-up `scans_remaining` is still a read-modify-write (fine now the same event can't double-process; distinct concurrent top-ups for one user is a rarer, separate concern).
- ✅ Consolidate: **no cherry-pick needed** — verified `main` already contains the embedding scanner code (`embeddingService`/`strainMatcher`/`hybridFusion`/`finalDecisionEngine`/`scanFusion`); it's just disconnected from `/api/scan`. The `recovery/docs-unique-work` branch is redundant for the core ID work. ⬜ archive the duplicate folders + recovery branch.
- ⬜ Reconcile/condense the ~28 root markdown docs into `docs/`; quarantine dead code.
- ⬜ Repo hygiene: stop tracking `tsconfig.tsbuildinfo`; iCloud "* 2.*" duplicate detritus (Desktop is iCloud-synced) keeps polluting local `.next` typechecks.

## Phase 1 — Identification engine (core differentiator)  ⬜
*Turn "honest guess" into measured, grounded accuracy.*
- 🟡 Eval harness built (`lib/scanner/scanAccuracy.eval.test.ts`, gated by `RUN_SCAN_EVAL`, paced + incremental for low-tier rate limits). **BASELINE (text-only GPT-4o, n=50 curated reference images / 27 strains): top-1 10%, top-3 14%.** Confidence uncalibrated (~59% stated even on wrong answers); over-predicts popular strains (white-widow/og-kush/gdp/gelato). Snapshot: `data/eval/baseline-textonly-2026-06-23.json`. ⬜ still need a clean held-out *user-photo* set + CI gate. **This 10% is the number Phase 1 must beat.**
- 🟡 Image-retrieval grounding — **A/B run, did NOT beat baseline** (leave-one-out, n=20: retrieval-only top1 0%/top3 20%; ungrounded top1 5%; grounded top1 0%/top3 20% — grounding even broke `durban-poison`). Snapshot: `data/eval/grounding-ab-2026-06-24.json`, harness `lib/scanner/retrievalGrounding.eval.test.ts`. **Finding: the bottleneck is retrieval quality (CLIP-base = 0% top-1 over noisy web refs), not the wiring.** Feeding a weak shortlist anchors the VLM to wrong candidates.
- ✅ Experiment #1 — **feed reference images** (query high-detail, refs low-detail), A/B n=11 (`data/eval/image-grounding-ab-2026-06-24.json`, harness `lib/scanner/imageGrounding.eval.test.ts`): **top-3 9%→27%, top-1 flat (9%).** Helped (unlike name-grounding) and visually rescued cases (e.g. afghan-kush), BUT **capped by retrieval recall — the correct strain was only in the top-K shortlist 45% of the time.** Image grounding is worth keeping; it can't lift top-1 until retrieval recall improves.
- ❌ **DISPROVEN (2026-07-02): image-embedding retrieval is a dead end — do not pursue.** Free recall A/B over 40 real cache strains (`scripts/recall-ab.mjs`): CLIP-base r@1 2.5% / r@3 9.0% · CLIP-large 3.0% / 9.5% · SigLIP-base 2.0% / 4.0% — **all at/near chance (1/40 = 2.5%)**; a stronger embedder does NOT help. Diagnostic (`scripts/recall-diagnose.mjs`): mean intra-strain cosine (0.767) ≈ inter-strain (0.770), NN same-strain rate = 5.0% = chance. **Conclusion: CLIP/SigLIP embeddings of dried flower carry ~zero strain-identity signal (fundamental — strains look near-identical as bud; not a data-cleaning problem).** No embedder swap, reference cleanup, or pgvector fixes this. Retire the embedding-grounding line; keep the honesty layer (calibration) for unlabeled buds.
- ➡️ **New north star for accuracy: the LABEL path is the only route to correct ID.** Perfect identification is achievable only when a strain name is visible (packaging / jar label / menu / seed packet).
- 🟡 **Label→catalog matcher shipped** (`lib/scanner/labelMatch.ts`, 14 tests): robust `matchLabelToCatalog` / `bestLabelMatch` — exact → normalized (plurals/punct/spacing) → token-containment (name embedded in a longer label) → bounded fuzzy (OCR typos), each scored; canonicalizes near-dup catalog entries to the curated one (`blue-dreams`→`blue-dream`, `GG4`→`gorilla-glue-4`) and rejects non-strain text. Deterministic **label promotion** wired into `/api/scan` (`applyLabelMatch`, flag `SCANNER_LABEL_MATCH=1`): a confident OCR match becomes the top candidate with `nameInImage=true`, so calibration awards it the high band. Runs before calibration. Doc: `docs/scanner-label-match.md`. ✅ **Alias enrichment (safe subset)**: added a **common-term BLOCKLIST** so ubiquitous label text (THC/CBD/CBG/BHO/AKA/OG/indica/…) can never resolve to a strain, + a small **hand-vetted supplemental alias** table (ATF→alaskan-thunder-fuck, PBB→peanut-butter-breath, GDP spellings). **Auto-generated initialisms were tried and REJECTED** — generation produced dangerous maps (THC→a strain, obscure strains hijacking famous acronyms like GDP); the existing 103 aliases already cover common shorthand well. ✅ **Flags flipped to DEFAULT ON (2026-07-03)** — `SCANNER_LABEL_MATCH` / `SCANNER_CALIBRATION` / `SCANNER_FREE_NAMING` are now kill switches (set to `0` to disable); deterministic pipeline verified end-to-end in `lib/scanner/flagDefaults.pipeline.test.ts`. ✅ **Matcher hardened (2026-07-03)**: new **compact** path (space-less lookup fixes `GG#4` → "gg 4" and fused `BlueDream` — found failing in the pre-flip verification) + **confusable** path (per-token OCR digit↔letter repair: `B1ue Dream`, `Gelato 4l`) + expanded hand-vetted aliases (MTF, GDP, Sour D, ECSD, MAC, SLH, Skittlez, Maui Waui, PB Breath; bare "GMO" deliberately excluded — "Non-GMO" is packaging boilerplate). ⬜ still: dedup the catalog's near-dup entries at the source (`blue-dream`/`blue-dreams`, `dosidos`/`do-si-dos`, `gg4`/`gorilla-glue-4`); consider pulling vetted aliases from the Supabase 35k table (human-reviewed only — never auto-generate).
- Three-experiment summary: baseline (text, n=50) 10%/14% · name-grounded (n=20) 0%/20% · image-grounded (n=11) 9%/27%.
- ⬜ Two-stage retrieve-then-rerank; drop the full catalog from the prompt.
- 🟡 Calibrate confidence empirically. ✅ **Calibration engine shipped** (flag `SCANNER_CALIBRATION=1`, default off): `lib/scanner/calibration.ts` + versioned table `lib/scanner/calibrationTable.json` fit by `npm run scanner:calibrate` (Bayesian-shrunk empirical accuracy + PAVA monotone pooling; evidence-anchored, not false-precision isotonic on n=50). Two strata by `matchSignals.nameInImage`: visualOnly **fit** (raw 0–79 → true ~8%, "80+" → 36%), nameInImage **declared prior** (pending flywheel labels). Applied as a route-level presentation transform in `/api/scan` (raw kept as `modelConfidence`); kept out of `normalizeAnalysis` so evals still measure raw. Doc + reliability table: `docs/scanner-calibration.md`. ✅ **Removed live fabricated fields**: the `confidence±` range (now shows the single calibrated point in the history/`WikiStyleResultPanel` view), the invented `consensusStrength` (v2 is one vision call — no consensus vote, set 0), and the dead `indicaPct`/`sativaPct`=50 default (scanner page). Legacy hybrid-engine internals (`consensusEngine`/`confidenceExplanation` hardcoded ranges) are dead in the v2 path and left as-is. ✅ flag flipped to DEFAULT ON (2026-07-03; kill switch `SCANNER_CALIBRATION=0`). ⬜ still: re-fit `nameInImage` from `scan_corrections`.
- ⬜ Fix feedback persistence → Supabase (currently local `.jsonl`, lost on serverless); activate the learned re-ranker + reward flywheel.
- ⬜ Phenotype modeling (cluster reference images per strain).
- ⬜ Model strategy: provider/model abstraction with failover; benchmark current top VLMs.

## Phase 2 — Data moat & legal  ⬜
*Defensible, rights-cleared data.*
- ⬜ Resolve image licensing: quarantine scraped images to training-only; add user-contribution license grant to ToS.
- ⬜ User-contributed data flywheel (confirm/correct UX + rewards) → owned labeled images at scale.
- ✅ **10,000-strain catalog built** (`data/strains-10k.json`, quality-ranked from the 35k via `scripts/build-10k-catalog.mjs` / `npm run catalog:build-10k`; 46% known type, 29% effects, curated 314 included). Typed loader + `resolveStrain()` in `lib/data/catalog10k.ts`. ✅ `resolveStrain` **wired into `/api/scan`** — candidates now carry `catalogSlug`/`inCatalog` (links a scan result to the library page; canonicalizes names). ✅ **Library/search already has 35,796 strains** in the Supabase `strains` table (rich schema: type/THC/CBD/effects/lineage/breeder/images) — the "314" was only the scanner's *prompt* catalog, never the library, so no seeding was needed.
- 🟡 **Free-naming A/B** (`data/eval/free-naming-ab-2026-06-24.json`): dropping the 314 catalog from the prompt + resolving the model's free answer to the 10k = **accuracy-neutral (5%/5% both, n=20)** BUT removes ~10k tokens/scan (≈half the cost), eases rate limits, and lets the scanner name 10k+ strains. **Recommended adoption** (cost/coverage win, neutral accuracy) — behind a flag, then make default. ✅ **wired into `/api/scan`** (`SCANNER_FREE_NAMING=1` → `FREE_SYSTEM_PROMPT`; free answer resolved to the 10k via `resolveStrain`). ✅ flipped to DEFAULT ON (2026-07-03; kill switch `SCANNER_FREE_NAMING=0`).
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

## Phase 6 — Plant Doctor & grower platform  🟡
*Strategy shift (2026-07-03, owner): strain ID from a bud photo is capped by
biology — but stage, age, and health of a LIVE PLANT are photo-assessable at
near-100%. Lead with what we can be right about.*
- ✅ **Plant Doctor scan mode shipped (2026-07-03)**: scanner now has a Strain ID / Plant Doctor toggle. Plant mode calls `/api/grow-doctor/diagnose` (upgraded to `grow-doctor-v2`): whole-plant assessment — **health score 0-100 + vigor, fine-grained stage (seedling → harvest-ready), estimated age range (weeks from sprout), weeks into flower, estimated weeks to harvest, trichome state, indica/sativa morphology read (never claims a strain)** — plus the existing ranked problem diagnoses / severity / do-this-now actions. Normalizer in `lib/scanner/plantAssessment.ts` (8 tests, no API spend); client in `lib/scanner/plantDoctorClient.ts`; panel `app/garden/scanner/PlantDoctorPanel.tsx`. ⬜ still: one real-photo prod sanity scan (owner-triggered, costs pennies); feed stage into grow-coach deep links; save plant scans to history.
- ✅ **Flywheel UNBLOCKED (2026-07-03)**: `scan_corrections` + `scan_feedback` tables created in prod (`018_scan_flywheel_tables.sql`, applied via management API). The feedback routes were already writing to them non-blocking — inserts silently failed table-less until now. ⬜ next: re-fit calibration `nameInImage` stratum once rows accumulate.
- ✅ **Dispensary finder upgraded (2026-07-03)**: `/api/dispensaries` now returns coordinates (was silently missing → distance/directions were broken for live results), med/rec classification from OSM `cannabis:medical`/`cannabis:recreational` tags, website/phone, node+way dedupe; UI adds Medical/Recreational filter chips + badges. Free (Overpass), no key. ⬜ later: state-legality banner; paid data source if OSM coverage disappoints.
- ✅ **Seed finder expanded (2026-07-03)**: `/garden/seed-vendors` directory grown to 27 real seed banks/breeders/marketplaces with honest descriptions + tag filters.
- ✅ **B2B Connect SHIPPED (2026-07-03)**: schema live in prod (`017_b2b_connect.sql` + `019` thread link) AND full API + UI. Routes: `/api/b2b/profile` (upsert, `verified` never client-settable), `/directory` (business-callers only, no contact columns), `/connect` (rate-limited 10/h, dup + reverse-request handling), `/connect/respond` (accept **auto-creates a direct chat thread** + participants via the existing `chat_*` tables from `015_garden_messaging`), `/connections` (contact revealed ONLY on accepted), `/messages` (participant-gated, 30/min, 4s-poll client — Realtime can swap in later). UI: `/garden/business` hub (Directory / Connections / My Profile tabs) + `/garden/business/chat/[threadId]`; replaced the "Community — Coming v2.0" home card. ⬜ next: admin verify flow (license → Verified badge), report/block, business-tier pricing decision, dispensary in-app menus (→ "scan a strain, see who has it nearby").
- ✅ **Chat phase 2 SHIPPED (2026-07-03)**: `/garden/community` (replaces the v1 "Coming v2.0" placeholder; card restored on garden home) — the 5 seeded system groups with join/leave, member+mod counts, and full group chat (`/garden/community/[threadId]`, 4s polling). **No-sales guard** (`lib/chat/salesGuard.ts`, 3 tests): conservative solicitation patterns block at post time with a friendly nudge; price *mentions* ("dispensary was selling it for $45 an eighth") deliberately pass. **Moderator tools**: mods (and owner) tap any message → Hide message / Mute 24h (`chat_participants.muted_until`, `021_chat_moderation.sql` applied to prod) / Remove from group; mods can't target other mods (owner can); muted users read-only with a banner; 🛡️ MOD badges on messages + group list. Subscribers only. ⬜ later: Supabase Realtime instead of polling; report button for members; unmute UI (owner can via API); message reactions (table already exists).
- ✅ **Admin console + moderator program + 2-way feedback SHIPPED (2026-07-03)**: `/garden/admin` (owner-only via `profiles.is_owner`, enforced by `lib/auth/ownerGate.ts`) — Overview stats, **Moderator Box** (per-group moderator counts/names across the 5 system groups), Verify tab (license → Verified badge), Moderators tab (approve volunteers → promotes to `chat_participants.role='moderator'` on all system groups + one-time **+10 scan bonus** via `profiles.id_scan_topups_remaining`, first approval only), Feedback tab (read + reply). **Volunteer ask** on the business profile form ("help keep our atmosphere clean and healthy" + bonus-scans note; activation is owner-approved, never self-serve). **Two-way feedback**: `/garden/feedback` (any signed-in user, 5/day; categories idea/suggestion/bug/praise/other) — legacy empty `feedback` table extended in place (`020_moderators_feedback.sql`, applied to prod); admin replies render on the user's page. Quick-link 💡 Feedback added to garden home. ⬜ later: notify users of replies (push/email); moderator tools inside group chat (hide message, kick).

---

## Needs the owner (blocks specific items)
- Accounts/keys: Google Play Developer ($25), Stripe live price IDs + webhook secret, RevenueCat keys, OpenAI / image-search keys (Apple Developer already held).
- Decisions: image-licensing approach, lawyer review of ToS + contribution consent, how aggressive to be on store-policy surfaces.

## Store-policy note (existential)
Apple & Google restrict cannabis apps that facilitate sale/use. Lead with web/PWA;
ship policy-safe native builds (flag off consumption/dispensary surfaces); keep a
direct-APK / PWA fallback. Plan around this from day one.
