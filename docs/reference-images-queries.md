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
