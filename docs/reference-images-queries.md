# Strain Reference Images — Query Helpers

Dev/admin queries for `strain_reference_images` (use Supabase SQL editor or psql).

## List candidates (unapproved)
```sql
SELECT id, strain_slug, match_confidence, created_at
FROM strain_reference_images
WHERE approval_status = 'candidate' AND approved = false
ORDER BY created_at DESC
LIMIT 50;
```

## List approved
```sql
SELECT id, strain_slug, match_confidence, created_at
FROM strain_reference_images
WHERE approved = true
ORDER BY created_at DESC
LIMIT 50;
```

## Promote candidate to approved (manual; admin only)
```sql
UPDATE strain_reference_images
SET approved = true, approval_status = 'approved', updated_at = now()
WHERE id = '<uuid>' AND approval_status = 'candidate';
```

## Dev API (development only)
`GET /api/dev/reference-images` — Returns JSON summary of candidates and approved (404 in production).

---

## image_url durability

- **Backend-first path:** Uses `image_url` from the scan row (written by external backend). If the backend stores a durable storage URL, that is used. Otherwise falls back to data URL.
- **Fallback path:** Attempts to upload the image to Supabase storage bucket `strain-reference-images` and uses the public URL. If upload fails (e.g. bucket missing, storage not configured), falls back to data URL.
- **Temporary URLs:** When no durable URL is available, `image_url` may be a `data:` base64 URL. These work but are large and not ideal for long-term storage.
