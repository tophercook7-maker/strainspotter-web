# StrainSpotter Strain Database Pipeline — Implementation Plan

**Version:** 1.0  
**Target scale:** 5,000 strains × ~20 images each (~100k images)  
**Principle:** AI assists extraction and normalization; the final truth lives in our database. Do not hallucinate strain data.

---

## Phase 1 — Data Model

### 1.1 `vault_strains` (canonical strain records)

**Purpose:** Single source of truth for strain identity. Every reference image and match result refers here.

| Column | Type | Notes |
|--------|------|-------|
| `strain_id` | uuid | PK, gen_random_uuid() |
| `canonical_name` | text NOT NULL | Display name (e.g. "Blue Dream") |
| `slug` | text NOT NULL UNIQUE | URL-safe identifier (e.g. "blue-dream") |
| `source_id` | text | FK to strain_source_records or external source ID |
| `review_status` | text | `pending` \| `approved` \| `rejected` |
| `reviewed_at` | timestamptz | When approved/rejected |
| `reviewed_by` | uuid | User or system that approved |
| `notes` | text | Admin notes |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Relationships:** Referenced by `vault_strain_images`, `strain_reference_images` (via slug), `strain_source_records`.

**Current state:** Already exists in `016_vault_schema.sql`; add `source_id`, `review_status`, `reviewed_at`, `reviewed_by`, `notes` via migration.

---

### 1.2 `vault_strain_images` (vault reference images — legacy/pipeline)

**Purpose:** Images ingested from TheVault pipeline (scraper, hero generator). Used by `vault_match_images` for vector search.

| Column | Type | Notes |
|--------|------|-------|
| `image_id` | uuid | PK |
| `strain_id` | uuid NOT NULL | FK vault_strains |
| `storage_path` | text NOT NULL | Supabase storage or TheVault path |
| `curation_level` | text | `hero` \| `curated` \| `external` |
| `image_type` | text | `bud` \| `whole_plant` \| `leaf` \| `packaging` \| `trichome` (nullable) |
| `status` | text | `active` \| `disabled` |
| `quality_score` | numeric | 0–1, nullable |
| `source_record_id` | uuid | FK strain_source_records, nullable |
| `created_at` | timestamptz | |

**Relationships:** FK to `vault_strains`. Optional FK to `strain_source_records`.

**Current state:** Exists; add `image_type`, `quality_score`, `source_record_id` via migration.

---

### 1.3 `strain_reference_images` (scan-sourced candidates + approved)

**Purpose:** Images from user scans (candidates) and manually promoted reference images. Future image-to-image matching.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `strain_slug` | text NOT NULL | Matches vault_strains.slug |
| `image_url` | text NOT NULL | Supabase storage URL |
| `source_type` | text | `scan_candidate` \| `manual` \| `ingestion` |
| `image_type` | text | `bud` \| `whole_plant` \| `leaf` \| `packaging` \| `trichome` (nullable) |
| `match_confidence` | numeric | For scan_candidate: match confidence at creation |
| `approved` | boolean | |
| `approval_status` | text | `candidate` \| `approved` \| `rejected` |
| `quality_score` | numeric | 0–1, nullable |
| `scan_event_id` | uuid | For scan_candidate |
| `source_record_id` | uuid | FK strain_source_records, nullable |
| `created_by` | uuid | |
| `approved_by` | uuid | |
| `notes` | text | |
| `metadata` | jsonb | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Relationships:** `strain_slug` → vault_strains.slug. Optional FK to strain_source_records.

**Current state:** Exists; add `image_type`, `quality_score`, `source_record_id` via migration.

---

### 1.4 `strain_source_records` (raw ingestion tracking)

**Purpose:** Track every external source we ingest from. No hallucinated data; each strain/image must trace to a source.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `source_type` | text | `file` \| `api` \| `scraper` \| `manual` |
| `source_uri` | text | Path, URL, or identifier |
| `raw_payload` | jsonb | Original extracted data (optional, for debugging) |
| `extraction_status` | text | `pending` \| `extracted` \| `failed` |
| `extraction_error` | text | Error message if failed |
| `extracted_at` | timestamptz | |
| `created_at` | timestamptz | |

**Relationships:** Referenced by `vault_strains.source_id`, `vault_strain_images.source_record_id`, `strain_reference_images.source_record_id`.

---

### 1.5 `strain_source_extractions` (AI-assisted structured output)

**Purpose:** Store AI-extracted structured data before human review. Grok or similar can populate this; humans approve before canonical insert.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `source_record_id` | uuid NOT NULL | FK strain_source_records |
| `extractor_model` | text | e.g. `grok-3`, `gpt-4o` |
| `structured_output` | jsonb | Strain name, slug, image types, etc. |
| `confidence` | numeric | Model confidence, 0–1 |
| `review_status` | text | `pending` \| `approved` \| `rejected` |
| `reviewed_at` | timestamptz | |
| `reviewed_by` | uuid | |
| `created_at` | timestamptz | |

**Relationships:** FK to strain_source_records.

---

### 1.6 `vault_image_embeddings` (vector search — future)

**Purpose:** Store embeddings for nearest-neighbor search. pgvector.

| Column | Type | Notes |
|--------|------|-------|
| `image_id` | uuid | FK vault_strain_images |
| `embedding` | vector(1536) | text-embedding-3-small; or 768 for older models |
| `model_version` | text | e.g. `text-embedding-3-small` |
| `created_at` | timestamptz | |

**Relationships:** FK to vault_strain_images. One row per image per model version.

---

## Phase 2 — Ingestion Pipeline

### Stage 1: Raw source fetch

- **Input:** File paths (TheVault), URLs, or API endpoints.
- **Output:** Files/images on disk or in Supabase storage.
- **Tracking:** Insert `strain_source_records` with `source_type`, `source_uri`, `extraction_status: pending`.
- **No AI here.** Only I/O and provenance.

### Stage 2: Raw text/image extraction

- **Input:** Raw files (images, text files, JSON).
- **Output:** Extracted text blocks, image paths, basic metadata (dimensions, format).
- **Tracking:** Update `strain_source_records.extraction_status` to `extracted` or `failed`.
- **AI optional:** OCR, captioning—but output is "raw extracted," not canonical.

### Stage 3: AI-assisted structured extraction

- **Input:** Raw extracted content (text, image captions).
- **Output:** `strain_source_extractions` rows with `structured_output` JSON.
- **Grok role:** Can run extraction (e.g. "Given this text, extract strain name, type, lineage"). Output is **proposal only**.
- **Do NOT:** Insert into `vault_strains` or `vault_strain_images` directly from AI output.

### Stage 4: Normalization / deduplication

- **Input:** `strain_source_extractions` rows with `review_status: pending`.
- **Process:**
  - Normalize names to canonical form (trim, case, slug).
  - Deduplicate by slug; merge alternate names into metadata.
  - Check against existing `vault_strains` for conflicts.
- **Output:** Normalized proposals, conflict report.
- **Human or scripted rules** for merge decisions. No AI as final arbiter.

### Stage 5: Review and approval

- **Input:** Normalized proposals, conflict report.
- **Process:** Human reviews in admin UI (or batch approve for trusted sources).
- **Output:** Update `strain_source_extractions.review_status` to `approved` or `rejected`.
- **On approve:** Insert/update `vault_strains`, `vault_strain_images`, link `source_record_id`.

### Stage 6: Storage into canonical tables

- **Input:** Approved extractions.
- **Process:** Insert `vault_strains`, `vault_strain_images`. Upload images to Supabase storage if not already.
- **Output:** Canonical rows. Trigger embedding generation (Stage 7, async).

---

## Phase 3 — Image Strategy

### Target: ~20 images per strain

| Image type | Target count | Purpose |
|------------|--------------|---------|
| `bud` | 6–8 | Primary matching (close-up buds) |
| `whole_plant` | 2–3 | Context, growth habit |
| `leaf` | 1–2 | Leaf shape |
| `packaging` | 2–4 | Label/brand recognition |
| `trichome` | 1–2 | Trichome density (optional) |

### Quality scoring

- **Dimensions:** Min 256×256; prefer 512×512 or larger.
- **Blur/quality:** Optional ML score (0–1) stored in `quality_score`.
- **Reject:** Watermarked, low-res, irrelevant (e.g. memes).

### Approved vs candidate

- **Candidate:** Ingested or scan-sourced; not yet promoted.
- **Approved:** Human-reviewed; used in matching.
- **Status flow:** `candidate` → (review) → `approved` or `rejected`.

### Source attribution

- Every image has `source_record_id` or `source_type` + `scan_event_id`.
- Enables audit trail and "where did this come from?"

### Embedding generation

- Run asynchronously after image insert.
- Model: `text-embedding-3-small` (1536 dim) or vision embedding if using image embeddings.
- Store in `vault_image_embeddings`.
- Re-run when model version changes.

---

## Phase 4 — Scanner Integration Plan

### 1. Quality gate

- Before matching: ensure user image meets min size, format.
- Reject obviously corrupt or too-small images.

### 2. Image embedding

- Use vision model (e.g. CLIP, or OpenAI image embedding) to embed user photo.
- Or: extract observations via vision LLM → embed observation text (current approach).

### 3. Nearest reference retrieval

- Query `vault_image_embeddings` via pgvector `<=>` (cosine) or `<->` (L2).
- Return top-K image_ids with similarity scores.

### 4. Candidate ranking

- Aggregate by strain_id (best similarity per strain).
- Apply quality/approval filters (only approved images).
- Rank strains by max similarity, then by image count.

### 5. Structured result output

- Return: `best` strain, `candidates`, `confidence`, `observations`.
- Shape already defined in judge route `buildStructuredResponse`.

### 6. Scan feedback loop

- High-confidence scans → `createCandidateReferenceIfEligible` → `strain_reference_images` (candidate).
- Admin promotes candidates → approved reference images.
- Future: approved refs can be synced into `vault_strain_images` for vector search.

---

## Phase 5 — Practical Build Order

### MVP (first milestone)

- **Dataset:** 100–500 strains with 3–5 images each.
- **Goal:** End-to-end pipeline works; scanner returns real matches.
- **Build:**
  1. Add `strain_source_records` table.
  2. Add `image_type`, `quality_score`, `source_record_id` to existing tables.
  3. Manual ingestion script: load 100 strains + images from existing TheVault data; insert `strain_source_records` + `vault_strains` + `vault_strain_images`.
  4. Ensure `vault_match_images` RPC works with current schema.
  5. No new AI extraction yet.

### Second milestone

- **Dataset:** 1,000 strains, ~10 images each.
- **Goal:** Ingestion pipeline with AI-assisted extraction; approval workflow.
- **Build:**
  1. Add `strain_source_extractions` table.
  2. Add `review_status` to `vault_strains`.
  3. Extraction job: read raw source → call Grok → write `strain_source_extractions`.
  4. Review UI (or CLI): list pending extractions, approve/reject, trigger canonical insert.

### Scale-up milestone

- **Dataset:** 5,000 strains, ~20 images each.
- **Goal:** Automated normalization, dedup, batch approval.
- **Build:**
  1. Normalization rules engine (slug generation, conflict detection).
  2. Batch approval for trusted sources.
  3. Image quality scoring (optional ML).
  4. Embedding backfill for all images.

### What to build first vs later

| First | Later |
|-------|-------|
| Schema migrations (add columns, new tables) | Full extraction pipeline |
| Manual ingestion for 100 strains | Grok integration |
| Verify vault_match_images with real data | Review UI |
| Image type metadata on new inserts | Quality scoring ML |
| `strain_source_records` for provenance | Embedding backfill for legacy images |

---

## Phase 6 — Grok: Where It Helps vs Not Trusted

### Grok CAN be used for:

- **Extraction:** "From this text/image caption, extract: strain name, type, lineage."
- **Normalization proposal:** "Suggest a slug for 'Blue Dream #7'."
- **Conflict suggestion:** "This might duplicate 'Blue Dream'—here's why."
- **Captioning:** "Describe this bud image in 1–2 sentences" for embedding text.

### Grok MUST NOT be used for:

- **Inserting into `vault_strains` or `vault_strain_images`** without human approval.
- **Final deduplication decisions** (human or deterministic rules).
- **Approval/rejection** of extractions.
- **Source of truth** — the database is. Grok is a worker, not the authority.

### Recommendation

- Grok writes to `strain_source_extractions` only.
- Approval step gates all canonical inserts.
- Batch approve for trusted sources (e.g. known seed catalogs) after validation.

---

## Suggested Next Code Tasks

1. **Migration: add columns to vault_strains**
   - `source_id`, `review_status`, `reviewed_at`, `reviewed_by`, `notes`

2. **Migration: add columns to vault_strain_images**
   - `image_type`, `quality_score`, `source_record_id`

3. **Migration: add columns to strain_reference_images**
   - `image_type`, `quality_score`, `source_record_id`

4. **Migration: create strain_source_records**
   - As defined in Phase 1.4

5. **Migration: create strain_source_extractions**
   - As defined in Phase 1.5

6. **Script: manual ingestion helper**
   - `scripts/ingest-from-vault.ts` — reads from TheVault paths, inserts strain_source_records + vault_strains + vault_strain_images for a small batch. No AI.

7. **Docs: ingestion runbook**
   - Step-by-step for running manual ingestion, then extraction job (when built).

---

## Summary

- **Schema:** Extend existing tables; add `strain_source_records` and `strain_source_extractions`.
- **Pipeline:** Raw fetch → extract → AI-assisted structure → normalize → review → canonical insert.
- **Images:** ~20 per strain, typed; quality scoring; approved vs candidate.
- **Scanner:** Already uses vault; ensure vector search works; feedback loop via strain_reference_images.
- **Grok:** Extraction worker only; never direct insert; approval gates all canonical data.
