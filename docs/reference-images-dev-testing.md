# Strain Reference Images — Dev Testing Guide

## What This Feature Does

- **Candidate creation:** When a scan succeeds with a matched strain and confidence ≥ 80%, a candidate row is created in `strain_reference_images`.
- **Approval separation:** Candidates have `approved = false` and `approval_status = 'candidate'`. Approved images have `approved = true` (set manually).
- **Durable URLs:** The pipeline prefers durable `http(s)` URLs. Fallback path uploads to Supabase storage; backend-first uses the scan row’s `image_url` when durable.

## How Candidate Images Are Created

1. **Backend-first path** (when `NEXT_PUBLIC_API_BASE` is set): After scan, fetches `image_url` from the scan row. Uses it if durable; otherwise uses data URL.
2. **Fallback path** (local judge/orchestrator): Before saving, uploads image to bucket `strain-reference-images`. Uses public URL if upload succeeds; otherwise data URL.

## Confidence Threshold

- **80% (0.8):** A candidate is only created when `primary_match.confidence >= 0.8`.
- Lower-confidence scans do not create candidates.

## Approved vs Candidate Separation

| Column            | Candidate | Approved |
|-------------------|-----------|----------|
| `approved`        | `false`   | `true`   |
| `approval_status` | `candidate` | `approved` |

Candidates are never auto-promoted. Promotion is manual (SQL or future admin flow).

## Durable URL Selection

- **Durable:** URL starts with `http://` or `https://` (storage/public URL).
- **Fallback:** `data:` base64 URL when no durable URL is available (e.g. upload failure, bucket not configured).

---

## Dev Test Checklist

### Prerequisites

- App running locally (`npm run dev`)
- Supabase configured (migrations applied, including `strain_reference_images` and `strain-reference-images` bucket)
- Cultivar DB loaded (for high-confidence strain matches)

### 1. Run a Scan

1. Go to `/garden/scanner`
2. Add one or more cannabis plant images
3. Click **Run Scan**
4. Wait until a result appears

### 2. Confirm Candidate Creation

**Option A — Dev API (fastest):**

```bash
curl http://localhost:3000/api/dev/reference-images
```

- Expect `candidates.count >= 1` and `candidates.rows` with your scan’s strain.

**Option B — Supabase SQL Editor:**

```sql
SELECT id, strain_slug, image_url, match_confidence, approved, approval_status, created_at
FROM strain_reference_images
WHERE approval_status = 'candidate'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Verify Candidate Fields

- `approved = false`
- `approval_status = 'candidate'`
- `match_confidence >= 80` (or 0.8 in 0–1 scale)
- `strain_slug` is non-empty

### 4. Check image_url Durability

- If `image_url` starts with `https://` or `http://` → durable
- If it starts with `data:` → fallback (data URL). Ensure `strain-reference-images` bucket exists and storage is configured for fallback path durability.

### 5. Manually Promote a Candidate (for testing)

```sql
UPDATE strain_reference_images
SET approved = true, approval_status = 'approved', updated_at = now()
WHERE id = '<paste-id-from-candidates>' AND approval_status = 'candidate';
```

Then re-check the dev API: the row should appear in `approved`, not `candidates`.
