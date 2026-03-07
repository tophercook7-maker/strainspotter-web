# PR Summary: Strain Reference Image Pipeline

> Copy/paste this into the GitHub PR description.

---

## What was added

- **Table:** `strain_reference_images` — stores candidate and approved strain reference images for future image-to-image matching
- **Migrations:** Table schema + storage bucket `strain-reference-images` (public, for fallback path uploads)
- **Logic:** Candidate creation from high-confidence scans (≥ 80%) in both backend-first and fallback scan paths
- **Durable URLs:** Prefer storage URLs when available; fallback path uploads to Supabase; backend-first uses scan row `image_url`
- **Dev API:** `GET /api/dev/reference-images` (dev only) — inspect candidates and approved
- **Docs:** Query helpers, dev testing guide, durability notes

## What was changed

- `saveScanHistory` — tries to upload image to storage before using data URL; delegates candidate creation
- `createCandidateReferenceIfEligible` — shared server action for both scan paths
- `GET /api/scans/[id]` — now returns `image_url` for durability checks
- Scanner page — backend-first path fetches durable URL from scan before creating candidate

## Why it matters

- Prepares for future image-to-image matching without changing current heuristic matching
- Builds a reference image corpus from user scans (candidates) with approval workflow
- Uses durable URLs when possible so reference images remain usable long-term

## What to test

1. Run a scan with a high-confidence match (≥ 80%) and confirm a row appears in `strain_reference_images`
2. Verify `approved = false`, `approval_status = 'candidate'`
3. Check `image_url` is durable (starts with `http(s)`) when storage is configured
4. Manually promote a candidate via SQL and confirm it appears in the approved list
5. Use `GET /api/dev/reference-images` in dev to inspect candidates and approved

See [reference-images-dev-testing.md](./reference-images-dev-testing.md) for the full dev test checklist.

## What is intentionally not included yet

- Auto-promotion of candidates to approved
- Admin UI for approving candidates
- Use of approved images in matching (hooks are passive stubs)
- Embedding-based image search
