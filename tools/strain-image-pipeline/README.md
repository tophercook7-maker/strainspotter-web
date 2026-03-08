# Strain Image Pipeline

End-to-end pipeline for strain reference image ingestion: fetch → extract → download → classify → quality → dedupe → promote → review queue.

## Quick Start (Successful Small Batch)

Run the pipeline in **fixture mode** with realistic cannabis strain fixtures:

```bash
cd tools/strain-image-pipeline
npm run run fixtures/test-batch.txt
```

This processes 4 strains (blue-dream, white-widow, rbog, white-widow-ruderalis) using real CC-licensed images from Wikimedia Commons. Expected: ~5 image URLs extracted, ~5 downloaded, ~3–4 passing quality and reaching the review queue.

## Vault Root

Outputs are written to a single consistent external-drive location:

- **Preferred**: `/Volumes/TheVault/strainspotter-vault`
- **Fallback**: `/Volumes/Vault/strainspotter-vault` (if TheVault not mounted)
- **Override**: `VAULT_ROOT` env var
- **CI/Dev**: `./vault-output` when no external volumes exist

## Test Inputs: Realistic Fixtures (Fixture Mode)

The successful test batch uses **realistic fixtures**:

- **Source**: Local HTML files in `fixtures/*.html` with image URLs pointing to Wikimedia Commons
- **Images**: Real cannabis strain photos (Blue Dream, White Widow, RBOG, Cannabis ruderalis) — CC BY-SA licensed
- **Mode**: Fixture only; no live page crawling. Images are downloaded from Commons (permitted for our use case).

## Test Mode: Fixture vs Live

- **Fixture mode** (default): Reads HTML from `fixtures/{strain}.html`, extracts image URLs, downloads images. Safe and reproducible.
- **Live mode**: Set `USE_FIXTURE=0`; fetches pages from source URLs. Uses throttling and descriptive user-agent.

## Outputs (Vault Structure)

| Path | Description |
|------|-------------|
| `raw_sources/html/` | Raw HTML (or fixture copies) per strain |
| `raw_sources/images/{strain}/` | Downloaded images before quality/dedupe |
| `raw_sources/rejected/` | Images rejected by quality check |
| `staging/candidate_strain_images/{strain}/` | Promoted candidates |
| `review_queue/images/` | Copies for human review |
| `review_queue/manifest.json` | Review queue manifest |
| `review_queue/rejected_log.json` | Rejected candidates (traceability) |
| `approved/strain_reference_images/{type}/{strain}/` | Approved reference images |
| `embeddings/image_vectors/` | Embedding records (JSON) and manifest |
| `logs/` | Run logs and manifests |

## Review Workflow (Human Approval)

After the pipeline runs, candidates land in `review_queue`. To approve or reject:

1. **Inspect candidates**: Open `{VAULT_ROOT}/review_queue/images/` and view the images.
2. **Edit manifest**: Open `{VAULT_ROOT}/review_queue/manifest.json`. Each candidate has:
   - `id`, `strainSlug`, `imagePath`, `imageType`, `sourceUrl`, `qualityScore`
   - `reviewStatus`: `"pending"` | `"approved"` | `"rejected"`
   - `reviewNotes`: optional (e.g. rejection reason)
3. **Mark decisions**: Set `reviewStatus` to `"approved"` or `"rejected"`. Add `reviewNotes` for rejected items.
4. **Run promotion**:
   ```bash
   npm run promote-approved
   ```
5. **Result**: Approved images are copied to
   `{VAULT_ROOT}/approved/strain_reference_images/{image_type}/{strain-slug}/`
   with a `.metadata.json` per image (source URL, quality score, approval timestamp).
   Rejected items remain traceable in `rejected_log.json` after the next pipeline run.

## Embedding Generation

After promoting approved images, generate embeddings so they are retrieval-ready for the scanner:

```bash
npm run generate-embeddings
```

- **Input**: Approved images in `approved/strain_reference_images/{type}/{strain}/`
- **Output**: Each image gets `{image-id}.embedding.json` in `embeddings/image_vectors/` with vector, metadata, model, timestamp
- **Manifest**: `embeddings/image_vectors/manifest.json` — lists all embedded images, model used, which have embeddings
- **Mode**: Currently **mock** (deterministic pseudo-vectors from path hash). Set `EMBEDDING_MODE=real` when a real provider is wired.
- **Duplicates**: Skips images already in the manifest. Use `FORCE_EMBEDDINGS=1` to re-embed all.

### Approved vs Embedded

| Stage | Location | Meaning |
|-------|----------|---------|
| Approved | `approved/strain_reference_images/` | Human-approved reference images with metadata |
| Embedded | `embeddings/image_vectors/` | Same images plus vector embeddings for retrieval |

Only approved images are embedded. Unapproved candidates are never embedded.

### Launch Reference Index (Retrieval Readiness)

The master-list pipeline produces a launch reference index that tracks which of the 5,000 launch strains are retrieval-ready:

```bash
cd tools/strain-image-pipeline
npm run master-list:build-launch-reference-index
```

- **retrieval-ready** = has source images + has approved reference images + has embeddings
- Outputs: `launch_reference_index_5000.json`, `launch_reference_ready.json`, `launch_reference_needs_approval.json`, `launch_reference_needs_embeddings.json`
- Rerun after approvals or embedding generation.

## Approved-Image Retrieval (Scaffolding)

After generating embeddings, you can retrieve top candidates by similarity:

```bash
npm run retrieve [seed] [topK]
```

Example:

```bash
npm run retrieve blue-dream 5
```

- **Input**: Query embedding (mock: deterministic from `seed` string). Pass seed as first arg; default `blue-dream`.
- **Output**: Top-K approved images ranked by cosine similarity to the query embedding.
- **Use case**: Later, the scanner will pass a real image embedding from a scan; this returns the most similar approved strain reference images.
- **Not wired** into production scanner yet; local pipeline only.

### How It Will Connect to the Scanner

1. Scanner captures/uploads a plant image.
2. Scanner generates an embedding for that image (via CLIP or similar).
3. Scanner calls retrieval with that embedding.
4. Retrieval returns top approved reference images (strain candidates).
5. Scanner shows those as suggested matches.

## Inspecting Results

- **Run log**: `{VAULT_ROOT}/logs/run_{runId}.log`
- **Manifest**: `{VAULT_ROOT}/logs/manifest_{runId}.json` — strains processed, pages fetched, URLs extracted, downloaded, rejected, promoted
- **Review manifest**: `{VAULT_ROOT}/review_queue/manifest.json`
- **Embedding manifest**: `{VAULT_ROOT}/embeddings/image_vectors/manifest.json` — which images have embeddings, model used

## Environment

- `VAULT_ROOT` — Override output root
- `USE_FIXTURE` — `1` (default) or `0` for live fetch
- `STRAIN_LIST` — Path to strain list file (one strain per line)
- `EMBEDDING_MODE` — `real` for live provider (when wired); default is mock
- `FORCE_EMBEDDINGS` — `1` to re-embed all approved images
