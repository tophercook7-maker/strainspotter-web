# How the Scanner Works (May 2026)

> ⚠️ **This document replaces a much older one** that described a Google
> Cloud Vision OCR + text-matching scanner. That architecture was
> abandoned. The current scanner is a single-call GPT-4o Vision pipeline
> with structured trait extraction. See below.

---

## Pipeline overview

```
User photo
   │
   ├─ HEIC → JPEG conversion (heic2any) when needed (iPhone)
   ├─ Resize / compress to ≤ ~1024 px (canvas)
   ├─ Base64 encode
   │
   ▼
POST /api/scan  (Edge runtime)
   │
   ├─ System prompt: 314-cultivar reference catalog + OCR-first protocol
   ├─ User prompt: image(s) + optional sellersClaim
   ├─ GPT-4o Vision call (max 4 images, "high" detail)
   │
   ▼
Defensive normalization → JSON response
   │
   │  observation:   ocrText, ocrStrainCandidates, visibleCategory,
   │                 categoryConfidence, imageType
   │  traits:        budStructure, trichomeCoverage, trichomeColor,
   │                 pistilColors, pistilDensity, coloration,
   │                 leafShape, qualityIndicators
   │  likelihood:    dominantTerpenes[],     typicalEffectFamily[]
   │  candidates:    [ { strainName, slug, confidence, matchReasoning,
   │                     matchSignals } × up to 5 ]
   │  summary:       primaryCandidateSlug, confidenceTier,
   │                 headline, advisoryNote
   │  claimValidation: null  | { sellersClaim, consistent: yes/ambiguous/no,
   │                              reasoning, expectedTraits, discrepancies }
   │
   ▼
scanOrchestrator.ts  (client)
   │
   ├─ Maps v2 schema → ScannerViewModel (legacy fields preserved)
   ├─ Adds vm.v2 with full v2 payload for Phase-2-aware UI
   │
   ▼
Scanner page  (app/garden/scanner/page.tsx)
   │
   ├─ "Doesn't look like cannabis" banner — when imageType is other/unclear
   │  AND top confidence < 15
   ├─ Seller's-claim card (yes/ambiguous/no with reasoning + discrepancies)
   ├─ OCR card showing extracted text + spotted strain names
   ├─ Multi-candidate display with calibrated confidence
   └─ Honest first-visit expectations modal
```

## Confidence calibration

The system prompt explicitly bakes these ranges into the model:

| Range | Meaning |
|-------|---------|
| 80–100 | Strain name visible in text AND visual traits consistent. Rare; reserved for clearly-labelled dispensary product. |
| 60–79  | Strain name visible in text but traits ambiguous, OR visual traits strongly distinctive AND match a single catalog cultivar. |
| 40–59  | Multiple plausible candidates; visual traits broadly match a small group. |
| 20–39  | General category clear (indica/sativa/hybrid) but specific strain genuinely uncertain. |
|  0–19  | Insufficient evidence. Image may not be cannabis flower or quality is too low. |

**The model is explicitly instructed not to inflate confidence.** Returning multiple plausible candidates with honest 30–50% confidence is treated as the correct answer when the image lacks readable text.

## Apple / health-claim safety

The scanner system prompt and the diagnostic system prompt both include:

- "NEVER claim a strain treats, cures, prevents, or alleviates any medical condition"
- "Use 'users commonly report' or 'typically associated with' framing"
- "Do not list 'medical conditions' — that field has been removed"
- "Frame effects as experiential, not therapeutic"

This applies equally to the strain catalog itself — `lib/data/strains.json` does NOT contain medical-condition fields.

## File map

```
app/api/scan/route.ts ............... Edge — main scanner endpoint
app/api/scan/feedback/route.ts ...... User feedback / training signal
app/api/scan/recalibration-status .. Calibration metric reporting
app/api/grow-doctor/diagnose ........ Cultivation problem diagnostic

lib/scanner/scanOrchestrator.ts ..... Client orchestration (Phase 2)
lib/scanner/viewModel.ts ............ ScannerViewModel typedef + v2 fields
lib/scanner/types.ts ................ Core scan-result types
lib/scanner/savedScanMappers.ts ..... Storage shape mappers
lib/scanner/savedScanTypes.ts ....... Storage shape types

lib/scanner/_unused/ ................ Archived CLIP-embedding pipeline
                                       (not reachable from any entry point;
                                        excluded from tsc; kept for reference)
```

## What's been deliberately left out

- **CLIP / local embedding matching** — archived in `lib/scanner/_unused/`. The reference-image library never reached the scale needed to outperform GPT-4o on accuracy.
- **Tesseract or Google Cloud Vision OCR** — replaced by letting GPT-4o do the OCR pass in the same call. One round-trip, fewer moving parts.
- **Auto-recalibration based on user feedback** — the scaffolding exists (`/api/scan/feedback`, `lib/scanner/rewardSystem.ts`, `lib/scanner/saveConfirmedTraining.ts`) but there's no live recalibration loop yet. Confirmed scans accrue as training data for a future fine-tune or rerank step.
