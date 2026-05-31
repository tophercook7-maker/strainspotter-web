# Smart Scanner Backend Patch

This backend uses Next.js App Router API routes. The active scan storage table in this repo is `public.scans`; no `public.scan_history` usage was found in backend code. The mobile contract still keeps both `scan_id` and `scan_history_id` optional for cross-repo compatibility.

## Migration

Run:

```text
migrations/2026_smart_scanner_feedback_compat.sql
```

The migration is based on the mobile repo source migration:

```text
StrainSpotter-Mobile/docs/migrations/2026_smart_scanner_feedback_compat.sql
```

It enables:

```sql
create extension if not exists vector;
```

and creates or updates:

- `public.scan_feedback`
- `public.strain_reference_images`

No new hard foreign keys are added to `public.scans` or `public.scan_history`. The migration also keeps compatibility with the older `scan_feedback` shape by adding the mobile-contract columns and making `scan_id` nullable.

### Manual Supabase SQL Steps

If local API tests return `Could not find the table 'public.scan_feedback' in the schema cache`, the migration has not been applied to the Supabase project used by `.env.local`.

1. Open the Supabase SQL editor for the project in `NEXT_PUBLIC_SUPABASE_URL`.
2. Run the full contents of:

```text
migrations/2026_smart_scanner_feedback_compat.sql
```

1. Verify the schema with:

```sql
select to_regclass('public.scan_feedback') as scan_feedback;
select to_regclass('public.strain_reference_images') as strain_reference_images;
select extname from pg_extension where extname = 'vector';
```

Expected:

```text
scan_feedback: public.scan_feedback
strain_reference_images: public.strain_reference_images
extname: vector
```

1. If the REST API still reports a schema-cache miss immediately after the migration, wait briefly or reload the PostgREST schema cache from the Supabase dashboard, then retry.

## Environment

Both scanner endpoints require:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Missing values return a clear 500 error instead of silently skipping writes.

## Endpoints

### `POST /api/scanner/feedback`

Stores feedback in `public.scan_feedback`.

Payload:

```json
{
  "scan_id": "00000000-0000-4000-8000-000000000000",
  "scan_history_id": null,
  "matched_strain_slug": "blue-dream",
  "selected_strain_slug": "blue-dream",
  "was_correct": true,
  "confidence": 82,
  "notes": "optional"
}
```

Response:

```json
{ "ok": true }
```

Test curl:

```bash
curl -X POST "http://localhost:3000/api/scanner/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "00000000-0000-4000-8000-000000000000",
    "matched_strain_slug": "blue-dream",
    "selected_strain_slug": "blue-dream",
    "was_correct": true,
    "confidence": 82
  }'
```

False/correction test curl:

```bash
curl -X POST "http://localhost:3000/api/scanner/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "00000000-0000-4000-8000-000000000002",
    "matched_strain_slug": "blue-dream",
    "selected_strain_slug": "sour-diesel",
    "was_correct": false,
    "confidence": 64,
    "notes": "Correction test"
  }'
```

### `POST /api/scanner/learned-match`

Reuses the current scanner output and applies a small learning layer from:

- approved `public.strain_reference_images` rows only (`approved = true`)
- prior `public.scan_feedback`

It does not replace `/api/scan`.

Payload using existing scanner results:

```json
{
  "result": {
    "candidates": [
      {
        "strainName": "Blue Dream",
        "slug": "blue-dream",
        "confidence": 62,
        "matchReasoning": "Label text and visual traits are partially consistent."
      }
    ]
  }
}
```

Payload using images, delegated to `/api/scan` first:

```json
{
  "images": ["data:image/jpeg;base64,..."],
  "sellersClaim": "Blue Dream"
}
```

Response shape:

```json
{
  "ok": true,
  "match": null,
  "matches": [],
  "confidence": 0,
  "reasoning": []
}
```

Test curl with existing result:

```bash
curl -X POST "http://localhost:3000/api/scanner/learned-match" \
  -H "Content-Type: application/json" \
  -d '{
    "result": {
      "candidates": [
        {
          "strainName": "Blue Dream",
          "slug": "blue-dream",
          "confidence": 62,
          "matchReasoning": "Existing scanner candidate."
        }
      ]
    }
  }'
```

Learning-behavior test setup:

```sql
insert into public.strain_reference_images
  (strain_slug, image_url, approved, source, notes)
values
  ('blue-dream', 'https://example.com/ignored.jpg', false, 'admin', 'should not affect score'),
  ('blue-dream', 'https://example.com/approved.jpg', true, 'admin', 'should add a small boost');

insert into public.scan_feedback
  (scan_id, matched_strain_slug, selected_strain_slug, was_correct, confidence, notes)
values
  ('00000000-0000-4000-8000-000000000010', 'blue-dream', 'blue-dream', true, 62, 'positive learning test'),
  ('00000000-0000-4000-8000-000000000011', 'sour-diesel', 'blue-dream', false, 58, 'negative learning test');
```

Then call `/api/scanner/learned-match` with `blue-dream` and `sour-diesel` candidates. Expected behavior:

- `approved = false` reference rows are ignored.
- `approved = true` reference rows add a small confidence boost.
- negative feedback reduces the matched strain slightly, capped by the conservative learning layer.

Cleanup:

```sql
delete from public.strain_reference_images where notes like '%learning test%' or notes like '%score%';
delete from public.scan_feedback where notes like '%learning test%';
```

Test curl with an image requires the same auth/subscription headers as `/api/scan`:

```bash
curl -X POST "http://localhost:3000/api/scanner/learned-match" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -d '{"images":["data:image/jpeg;base64,..."]}'
```

## Confidence Behavior

The learning layer is intentionally conservative. Approved references and prior feedback only add small boosts, and negative corrections can reduce a candidate. Low-confidence matches remain low-confidence.

## Retest Results

Last retest: 2026-05-22 local dev server at `http://localhost:3000`.

Schema visibility through Supabase REST:

- `public.scan_feedback`: pass.
- `public.strain_reference_images`: pass.
- `public.scans`: pass.
- `public.scan_history`: not present in this backend project, which uses `public.scans`.

Endpoint results:

- `POST /api/scanner/feedback` with `was_correct: true`: pass, returned `{ "ok": true }`.
- `POST /api/scanner/feedback` with `was_correct: false`: pass, returned `{ "ok": true }`.
- `POST /api/scanner/learned-match` with an existing scanner result payload: pass, returned `{ ok, match, matches, confidence, reasoning }`.

Learning behavior:

- `approved = false` reference image: pass, confidence delta `0`.
- `approved = true` reference image: pass, confidence delta `+1`.
- negative feedback: pass, confidence delta `-1`.

No schema-cache errors remained after aligning the feedback route to the mobile-contract columns created by the migration.

## Production Deployment

Last production deploy: 2026-05-22.

Deployment:

- Vercel project: `strainspotter-web`.
- Production deployment URL: `https://strainspotter-7io26lhie-tophercook7-makers-projects.vercel.app`.
- Production alias: `https://app.strainspotter.app`.
- Public app domain tested by mobile: `https://strainspotter.app`.

Build status:

- `npm run build`: pass.
- Next.js route manifest included:
  - `/api/scanner/feedback`
  - `/api/scanner/learned-match`
- Vercel production build: pass.

Production smoke tests:

- `GET https://strainspotter.app/api/scanner/feedback`: `405`, pass. Route exists; GET is not supported.
- `GET https://strainspotter.app/api/scanner/learned-match`: `405`, pass. Route exists; GET is not supported.
- `POST https://strainspotter.app/api/scanner/feedback`: `200`, returned `{ "ok": true }`.
- `POST https://strainspotter.app/api/scanner/learned-match`: `200`, returned `{ ok, match, matches, confidence, reasoning }`.

`404` is no longer present for the Smart Scanner production routes.
