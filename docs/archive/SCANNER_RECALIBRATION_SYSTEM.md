# Scanner recalibration & confirmed training

## Principles

- StrainCompass/API reference images are useful for bootstrapping but **often duplicated across strains** (same file bytes, different labels). Quality gates **disable cross-strain exact duplicates** while **never** applying that rule to **user-confirmed** promotions (`user-confirmed-scan` / `trusted_user_confirmed`).
- The scanner **does not learn from its own unconfirmed guesses**. Training signals come only from **explicit confirmations**: tapping **Correct** on a candidate, entering a **corrected strain name**, choosing **None of these** with a correction, or future **admin-approved** labels.
- **Immediate effect**: each feedback row appended to `data/scan-feedback-local.jsonl` feeds `lib/scanner/feedbackPrior.ts` on the next request — including a **small competitor penalty** when users confirmed strain B while strain A was ranked #1 (stored as `wrongTopMatchSlug`).
- **Full visual upgrade**: confirmed scans append to `data/scanner-training/confirmed-scans.jsonl`; optional JPEG bytes are stored under `data/scanner-training/images/<slug>/<hash>.<ext>` (never raw base64 in JSONL). Promoting those rows adds trusted references; rebuilding embeddings refreshes nearest-neighbor matching.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run scanner:health` | Reference counts, embedding stats, **API vs user-confirmed** breakdown, duplicate/marketing disables, feedback-derived wrong-leader hints |
| `npm run scanner:recommend` | Strains that likely need more exact references |
| `npm run scanner:training:dedupe` | Remove duplicate confirmed-scan JSONL rows (slug+hash, else slug+local path key); preserves earliest line, writes `.backup-before-dedupe`; does **not** delete image files |
| `npm run scanner:training:promote` | Append trusted **user-confirmed-scan** rows into `reference-images.jsonl` |
| `npm run scanner:recalibrate` | **Promote first** → quality gate (API cross-strain duplicates stay disabled; user-confirmed protected) → `references:index` → `references:embeddings` → `references:audit`; clears `recalibration-needed.json` |

## Environment

- **`SCANNER_AUTO_RECALIBRATE`** (default `false`): when `true`, saving confirmed feedback writes `data/scanner-training/recalibration-needed.json` with `{ needed: true, reason: "new feedback", updatedAt }`. Heavy indexing **never** runs inside the Next route (unsafe on serverless). Run **`npm run scanner:recalibrate`** locally or in CI.

## UI / API

- **`GET /api/scan/recalibration-status`** — pending flag, confirmed-scan counts, promoted reference count, embedding index stats.
- Scanner page shows **“New training feedback saved. Recalibration pending.”** when the flag is set; **development** builds also print `npm run scanner:recalibrate`.

## Optional debug

- Set **`SCANNER_DEBUG_MATCHING=true`** so `/api/scan` returns `matchingDebug.topEmbeddingMatches`; richer neighbor lists improve conservative competitor gating in `getFeedbackPrior`.
