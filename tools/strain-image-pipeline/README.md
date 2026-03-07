# Strain Image Ingestion Pipeline

Collects and organizes cannabis strain images into the external Vault drive, preparing them for the 5,000-strain database.

**See also:**
- [Implementation Plan](../../docs/strain-image-ingestion-implementation-plan.md)
- [Source Strategy](../../docs/strain-image-ingestion-source-strategy.md)
- [Vault Structure](../../docs/strain-image-ingestion-vault-structure.md)
- [Review Model](../../docs/strain-image-ingestion-review-model.md)
- [Legal & Safety](../../docs/strain-image-ingestion-legal-safety.md)
- [Execution Roadmap](../../docs/strain-image-ingestion-roadmap.md)

## Prerequisites

- Node.js 18+
- External Vault drive at `/Volumes/Vault` or `/Volumes/TheVault` (auto-detected)
- Run `npm install` in this folder

## Installation

```bash
cd tools/strain-image-pipeline
npm install
```

## Pipeline Stages

1. **Download** — Fetch images from sources (20 per strain, 500 per run max)
2. **Classify** — Detect image type: bud, whole_plant, leaf, trichome, packaging
3. **Quality filter** — Reject blur, low resolution (<512px), too dark, heavy watermark
4. **Dedupe** — Remove near-duplicates via perceptual hashing
5. **Promote** — Move approved images to staging

## How Images Move Through the Vault

| Stage   | Source                                               | Destination                                                      |
|---------|------------------------------------------------------|------------------------------------------------------------------|
| Download| Image sources (API/config)                            | `/Volumes/Vault/strainspotter-vault/raw_sources/images/{strain}/` |
| Quality | raw_sources/images                                   | Rejected → `/raw_sources/rejected/`                              |
| Promote | raw_sources/images (after quality + dedupe)           | `/staging/candidate_strain_images/{strain}/`                     |

## Running the Pipeline

```bash
# Full pipeline (download → classify → quality → dedupe → promote)
npm run run

# With custom strain list
STRAIN_LIST=/path/to/strains.txt npm run run
# or
npx tsx pipeline_runner.ts /path/to/strains.txt

# Individual stages
npm run download
npm run classify
npm run quality
npm run dedupe
```

## Configuration

Edit `config.ts`:

- `VAULT_ROOT` — Base path (default: `/Volumes/Vault/strainspotter-vault`)
- `MAX_IMAGES_PER_RUN` — 500
- `MAX_IMAGES_PER_STRAIN` — 20
- `MIN_RESOLUTION_PX` — 512
- `BLUR_THRESHOLD` — Laplacian-based blur cutoff
- `PHASH_SIZE` / `PHASH_THRESHOLD` — Deduplication sensitivity

## Output

After each run, the pipeline prints:

- Number of strains processed
- Number of images downloaded
- Number rejected (quality + dedupe)
- Number promoted to staging

## Image Sources

The download step uses `getImageUrlsForStrain()` in `download_images.ts`, which returns an empty list by default. To fetch real images:

1. Add a Google Custom Search API key or similar
2. Implement `getImageUrlsForStrain()` to return image URLs
3. Or pass `imageUrlsByStrain` when calling `runDownload()`

## No Web App Changes

This pipeline runs as a standalone tool. It does not modify the StrainSpotter web app.
