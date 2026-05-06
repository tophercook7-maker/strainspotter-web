# lib/scanner/_unused/

These files are **not currently reachable** from any entry point in `app/` and were
moved here on May 6, 2026 during the post-pivot cleanup. They are preserved (not
deleted) because they represent significant prior work — most are leftovers from
the **CLIP-embedding + Supabase reference-image pipeline** that the scanner used
before pivoting to the **GPT-4o Vision + 314-strain catalog** approach now wired
up at `app/api/scan/route.ts`.

## What's in here

### Old CLIP / embedding pipeline (the abandoned route)
- `visualEmbeddingMatcher.ts` — CLIP cosine-similarity against reference index
- `referenceTrustWeighting.ts` — trust-weighted reference scoring
- `referenceQualityScore.{ts,js}` — reference image quality gating
- `referenceSource.ts` — reference image provenance
- `embeddingOnlyRanking.{js,d.ts}` — embedding-only ranking strategy
- `normalModeRanking.{js,d.ts}` — normal-mode ranking strategy
- `feedbackPrior.ts` — Bayesian feedback weighting
- `recentScanDebugLog.ts` — debug log for matching internals
- `scannerCostEnv.ts` — `SCANNER_AI_PROVIDER` / `SCANNER_COST_MODE` flag readers
- `scannerMatchingEnv.ts` — `SCANNER_MATCHING_MODE` / `SCANNER_DEBUG_MATCHING` flags

### Old strain matcher / pipeline orchestration
- `strainMatcher.ts` (1693 lines) — multi-signal scoring across name, embedding, metadata, providers
- `rankedScanPipeline.ts` (896 lines) — full pre-pivot scan pipeline

### Old prompt + report builders
- `scanPromptBuilder.ts` — older system prompt for trait-extraction-only scans
- `growCoachBuilder.ts` — grow-coach payload builder (called only by the now-unused `lib/growlog/enrichGrowCoach.ts`)
- `multiImageGuidance.ts` — multi-image angle guidance (only used by the removed `ImageGuidancePanel`)

### Stubs from earlier plans
- `confidenceCopy.ts`, `perceivedIntelligence.ts`, `userTrustExplanation.ts` — small stubs from prior architecture iterations

## Reviving any of this

If the scanner ever needs to reincorporate embedding-based matching, reference-image
trust weighting, or the multi-signal scoring pipeline, these files are the starting
point. They were last verified to typecheck cleanly during the May 2026 cleanup,
but **internal imports may need updating** if the live `lib/scanner/` API changes.

To revive a file:
1. Move it back to `lib/scanner/`
2. Re-run `npx tsc --noEmit` — fix any drift since archiving
3. Wire it into `scanOrchestrator.ts` or a new entry point
