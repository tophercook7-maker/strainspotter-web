# Supabase scanner storage (references & training)

## Roles

- **TheVault / local paths** — Developer cache and source of truth on your machine. Production users must not depend on mounted volumes or local JSONL paths.
- **Supabase Storage** — Cloud object store for approved reference imagery and user-confirmed training crops. Uploads use the **service role key only on the server** (CLI scripts, API routes). Never expose `SUPABASE_SERVICE_ROLE_KEY` via `NEXT_PUBLIC_*` or client bundles.

## Buckets

| Bucket | Purpose | Default visibility |
|--------|---------|--------------------|
| `scanner-reference-images` | Licensed / approved reference photos used for matching and display | Public read (anon `SELECT` on `storage.objects`) |
| `scanner-training-images` | User-confirmed scan crops for training | Private (no anon read policy) |

Override names with `SUPABASE_REFERENCE_BUCKET` and `SUPABASE_TRAINING_BUCKET`.

Bucket creation: migration `supabase/migrations/create_scanner_storage_buckets.sql` or dashboard steps in [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md).

## Database

Migration: `supabase/migrations/create_scanner_reference_images.sql`

Table **`public.scanner_reference_images`** holds metadata for objects in **either** bucket (`storage_bucket` + `storage_path`). Training uploads set `source_name = user-confirmed-scan`, `public_url` null, and use the training bucket.

Authenticated users may **read** metadata rows only when `disabled = false` and `storage_bucket` is the reference bucket (training rows stay server-side).

## Env

See `.env.example` / `.env.local.example`:

- `REFERENCE_SOURCE` — `local` \| `supabase` \| `hybrid` (controls future metadata wiring in `lib/scanner/referenceSource.ts`; embeddings stay local in dev).
- `SUPABASE_REFERENCE_BUCKET` — default `scanner-reference-images`
- `SUPABASE_TRAINING_BUCKET` — default `scanner-training-images`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or legacy `SUPABASE_SERVICE_KEY`)

## Run migrations

Use your normal Supabase workflow, for example:

```bash
supabase db push
```

Or run the SQL files in the Supabase SQL editor (storage migration first, then table migration).

## Sync approved references

Reads `data/strain-reference-images/reference-images.jsonl`.

**Default upload rules**

- `disabled !== true`
- `status === "downloaded"`
- `localPath` resolves to an existing file
- `contentHash` is a 64-char hex SHA-256
- Skips rows whose `reviewStatus` starts with `needs_review` unless `--include-needs-review` is enabled
- Skips placeholder signals in `reviewStatus` / `disabledReason`

**Storage path:** `references/<strain-slug>/<contentHash>.<ext>`

**Dedupe:** `(strain_slug, content_hash, storage_bucket)` unique upsert.

Commands:

```bash
npm run supabase:sync:references -- --dry-run --limit 20
npm run supabase:sync:references -- --limit 100
```

Other flags: `--strain "Afghan Kush"`, `--force`, `--include-needs-review true`.

## Sync training images

Reads `data/scanner-training/confirmed-scans.jsonl`, uploads to **`scanner-training-images`** at `training/<strain-slug>/<imageHash>.<ext>` and upserts metadata into `scanner_reference_images`.

```bash
npm run supabase:sync:training -- --dry-run --limit 20
```

## Health report

```bash
npm run supabase:references:health
```

Reports local eligible references, confirmed training files with paths, Supabase row counts, distinct strains (reference bucket), a histogram of reference counts per catalog strain, and a sample Storage list for the training prefix.

## Cost / operations

- Storage and egress charges apply (especially if reference bucket is public CDN-backed URLs).
- Large libraries can mean millions of objects — plan lifecycle rules and periodic audits.
- Re-sync with `--force` rewrites objects and metadata; use sparingly.

## Security checklist

- Service role key only in server/CI secrets.
- Do not upload disabled, duplicate-flagged, wrong-match, or placeholder assets by default.
- Preserve attribution fields (`source_name`, `source_page_url`, `original_image_url`, `license_note`) in metadata upserts.
