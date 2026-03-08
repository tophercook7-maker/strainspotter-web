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

## Inspecting Results

- **Run log**: `{VAULT_ROOT}/logs/run_{runId}.log`
- **Manifest**: `{VAULT_ROOT}/logs/manifest_{runId}.json` — strains processed, pages fetched, URLs extracted, downloaded, rejected, promoted
- **Review manifest**: `{VAULT_ROOT}/review_queue/manifest.json`

## Environment

- `VAULT_ROOT` — Override output root
- `USE_FIXTURE` — `1` (default) or `0` for live fetch
- `STRAIN_LIST` — Path to strain list file (one strain per line)
