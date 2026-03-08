# Canonical 5,000-Strain Master List

## What It Is

A local, pipeline-side workflow for building a trusted master list of ~5,000 cannabis strains. Records support:

- **Canonical names** — one authoritative display name per strain
- **Aliases** — alternate names (e.g. "OG Kush" vs "O.G. Kush")
- **Dedupe** — grouping and merging of likely duplicates from multiple sources
- **Source tracking** — where each record originated
- **Review status** — pending / approved / rejected

## How Aliases and Duplicates Are Handled

1. **Raw ingest**: Strain names from scrapers, APIs, or manual imports land in `raw_imported_names.json`.
2. **Normalize**: Names are slugified (lowercase, hyphens) and grouped by slug.
3. **Dedupe review**: `dedupe_candidates.json` and `dedupe_review.json` list groups of variants. Human review decides which become the canonical name.
4. **Canonical list**: Approved records are written to `canonical_strains.json`.
5. **Alias map**: `alias_map.json` maps each alias → canonical slug for lookups.

## Bulk Import Workflow

### 1. Drop source files

Place raw strain-name files in:
```
tools/strain-image-pipeline/master-list/sources/
├── leafly/        # Leafly or similar
├── wiki/          # Wikipedia or strain wikis
└── <vendor>/      # Add subfolders per source
```

Supported formats: `.txt` (one per line), `.csv` (name/strain column), `.json` (array).

### 2. Run bulk import

```bash
cd tools/strain-image-pipeline
npm run master-list:bulk-import
```

The script scans all subdirs, imports every `.txt`/`.csv`/`.json` file, merges into `raw_imported_names.json` (skipping exact duplicates), then regenerates canonical outputs once at the end.

### 3. Inspect dedupe candidates

- **dedupe_review.json** — Sorted by variant count (largest duplicate groups first). Fields: `normalized`, `variantCount`, `variants`, `suggestedCanonical`, `reviewStatus`.
- **review_state.json** — Lightweight scaffold for decisions (approved/rejected, merge target, notes).

### 4. Single-file import (optional)

```bash
npm run master-list:import -- path/to/your_file.txt
```

## Import Formats

- **TXT**: One strain name per line
- **CSV**: Uses a column named `name` or `strain` if present, otherwise column 0
- **JSON**: Array of strings, or array of objects with `name`, `strain`, or `strain_name` field

## Duplicate handling

Exact duplicate raw names (same string) are skipped when re-importing. Source file and import timestamp are preserved where available.

For 35k records, display name and slug from the same source line are merged into one canonical (slug is used as the linking key; slugs are not added as separate raw records).

## 35k Dataset Import

Import the full strain list from TheVault:

- **Source**: `/Volumes/TheVault/full_strains_35000.txt`
- **Format**: `Display Name|slug` (pipe-delimited, ~35,550 records)
- **Image root**: `/Volumes/TheVault/StrainSpotter/datasets`

```bash
cd tools/strain-image-pipeline
npm run master-list:import-35k
```

### Full pipeline (import + image index + launch priority)

```bash
npm run master-list:full-35k-pipeline
```

1. Imports 35k strain list into `raw_imported_names.json`
2. Runs dedupe/canonical generation
3. Builds `image_folder_index.json` from StrainSpotter/datasets
4. Links canonical strains to image availability
5. Produces `launch_priority_5000.json` (top 5,000, prioritized by image availability)

### Image linking outputs

- **image_folder_index.json** — strain folders with image counts and example paths
- **strain_image_link.json** — which canonical strains have images
- **launch_priority_5000.json** — top 5,000 ranked (image-backed first, then image-less)
- **launch_ready_image_backed_5000.json** — launch-ready set for the image pipeline: **only** image-backed strains, ranked by coverage and quality. Use this for scanner/ingestion. Each record has `canonicalName`, `slug`, `aliases`, `imageFolderKey`, `imageCount`, `examplePaths`.
- **launch_reference_index_5000.json** — retrieval readiness index: joined view of launch strains with `hasImages`, `hasApprovedImages`, `hasEmbeddings`, `retrievalReady`. Rerun `master-list:build-launch-reference-index` after approvals or embedding generation.

## Path to 5,000 Trusted Strain Records

1. Drop source files into `sources/` (by vendor or library), or run `master-list:import-35k` for the full dataset.
2. Run `npm run master-list:bulk-import` or `npm run master-list:import-35k`.
3. Review `dedupe_review.json` and adjust canonical choices if needed.
4. Run `npm run master-list:build-launch-priority` for launch_priority_5000.json.
5. Run `npm run master-list:build-launch-ready` for the launch-ready image-backed set.
6. Run approval and embedding pipelines. Then run `npm run master-list:build-launch-reference-index` to index retrieval readiness.
7. Feed `launch_reference_ready.json` (retrieval-ready strains) or full canonical list to approved/vault_strains for scanner use.
