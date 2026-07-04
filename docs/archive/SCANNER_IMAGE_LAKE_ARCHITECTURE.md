# Scanner image lake architecture

Two libraries work together: a **large local warehouse** on TheVault and a **cloud mirror** in Supabase. Scanner **matching** stays conservative; the lake exists for **future training, auditing, and better filters**.

## TheVault (local raw lake)

Optional root via `REFERENCE_IMAGE_STORAGE_ROOT` (often on **`/Volumes/TheVault/StrainSpotter/reference-images`**).

Responsibilities:

- Hold **all** useful binaries we have fetched: approved, pending review, rejected, external search candidates, duplicates, low dimensions, seed/marketing assets, and training/user-confirmed sources (per catalog layout).
- Under **image lake mode** (`REFERENCE_IMAGE_LAKE_MODE=true`), downloads are **aggressive**: many rows are stored under **`raw/<reviewStatus>/<strainSlug>/<hash>.<ext>`** even when `disabled=true`, so nothing is thrown away only because marketing or auto-review disabled the row.
- **Production-shaped** matchable references still use **`cache/<strainSlug>/<hash>.<ext>`** (same layout as today) so indexing and Supabase production sync stay predictable.

The lake is **not** a reason to loosen **matching** rules.

## Supabase (cloud library)

Three buckets (names configurable via env):

| Bucket | Role |
|--------|------|
| `scanner-reference-images` | **Production references** — approved / trusted / exact paths used for live scanner matching after sync. |
| `scanner-training-images` | **User-confirmed training** images (private). |
| `scanner-reference-raw-images` | **Non-matchable** or **pending / rejected / raw** metadata + blobs for research and future training (private). |

Database table `scanner_reference_images` carries:

- **Storage** for the primary object: `storage_bucket`, `storage_path`, `public_url`.
- **Lake / classification**: `library_tier` (`raw` | `pending` | `approved` | `trusted` | `rejected`), **`is_matchable`** (only rows that the scanner should use for embedding / fingerprint **matching**).
- **Raw mirror fields** (optional, explicit): `raw_storage_bucket`, `raw_storage_path`, `raw_public_url` — used for raw-tier rows and debugging.

## Review status vs trust

- **Trusted / confirmed** (e.g. `trusted_user_confirmed`, `trusted_manual_exact`, `api_exact_match`) → high trust, **matchable** when not disabled and downloaded.
- **Approved external** (`approved_external_exact`, `approved_external_auto`) → **matchable** when policy allows (still subject to `disabled`, file on disk).
- **Pending** (`needs_human_review_external`, `needs_review_external_search`, other `needs_review*`) → **stored** in the lake and optionally synced to the **raw** bucket; **not matchable** until promoted.
- **Rejected** (`rejected_external`, auto-review reasons) → **stored** for training; **never matchable** unless explicitly reclassified.

## Scanner matching (fingerprints + embeddings)

**Only matchable rows** are included in:

- `reference-index.json` (byte features)
- `reference-embedding-index.json` (CLIP-style embeddings)

Criteria include: `status === "downloaded"`, file present, `disabled !== true`, and **`reviewStatus` in the allowlisted production set** (see `isScannerMatchableReferenceRow` in `scripts/reference-utils.js`). Pending, rejected, and raw-tier rows are **excluded** even if a file exists locally or in Supabase Raw.

## OpenAI

Disabled for this pipeline: do not set `SCANNER_BUILD_REFERENCE_WITH_OPENAI` for lake automation; indexing stays local.

## Related env vars

| Variable | Purpose |
|----------|---------|
| `REFERENCE_IMAGE_LAKE_MODE=true` | Aggressive local downloads into TheVault paths (`raw/...` vs `cache/...`). |
| `SUPABASE_SYNC_ALL_REVIEW_IMAGES=false` | When `true`, raw sync considers every non-matchable downloaded row (subject to other flags). |
| `SUPABASE_SYNC_REJECTED_IMAGES=false` | When `false`, raw sync skips `rejected_external` rows. |
| `SUPABASE_SYNC_PENDING_IMAGES=true` | When `true`, raw sync includes human + external-search pending queues. |
| `SUPABASE_REFERENCE_RAW_BUCKET=scanner-reference-raw-images` | Raw / non-matchable bucket id. |

Production buckets remain `SUPABASE_REFERENCE_BUCKET` (default `scanner-reference-images`) and `SUPABASE_TRAINING_BUCKET` (default `scanner-training-images`).

## Commands

- Full lake batch (fetch, download lake, auto-review, index/embed matchable-only, sync prod + optional raw):

  ```bash
  npm run scanner:image-lake -- --fetch-new --limit-strains 50 --target-images 25 --max-new-images 1000 --confirm-search-cost --sync-approved --sync-raw
  ```

- Process **existing** queue only:

  ```bash
  npm run scanner:image-lake -- --sync-approved --sync-raw
  ```
