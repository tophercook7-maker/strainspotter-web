# Canonical Strain Master List

Scaffolding for a 5,000-strain master list with alias/dedupe support. Feeds the Vault and eventual promotion into approved data.

## Record Shapes

- **Canonical**: `canonical-strain-record.ts` — slug, canonical_name, aliases, type, lineage, source_records, review_status
- **Raw import**: `raw-import-record.ts` — messy source names before approval

## Quick Start

### Seed initial dataset
```bash
cd tools/strain-image-pipeline
npm run master-list:seed
```

### Bulk import from sources/
```bash
# 1. Drop source files into master-list/sources/ (or subdirs: leafly/, wiki/, vendor_name/)
# 2. Run bulk import
npm run master-list:bulk-import
```

### Import specific files
```bash
npm run master-list:import -- path/to/strains.txt
npm run master-list:import -- path/to/export.csv path/to/names.json
```

### Rebuild canonical outputs only
```bash
npm run master-list:rebuild
```

## Bulk Source Input Structure

| Path | Purpose |
|------|---------|
| `master-list/sources/` | Drop raw strain-name files here |
| `sources/leafly/` | Leafly or similar |
| `sources/wiki/` | Wikipedia or strain wikis |
| `sources/<vendor>/` | Add subfolders per source |

Supported formats: `.txt` (one per line), `.csv` (name/strain column), `.json` (array).

## Import Formats

| Format | Description |
|--------|-------------|
| `.txt` | One strain name per line |
| `.csv` | Header row with `name` or `strain` column; or column 0 if no header |
| `.json` | Array of strings, or array of objects with `name`, `strain`, or `strain_name` |

## Review Tooling

- **dedupe_review.json** — Sorted by variant count (largest groups first). Fields: `normalized`, `variantCount`, `variants`, `suggestedCanonical`, `reviewStatus`, `mergeTarget`, `notes`.
- **review_state.json** — Lightweight review decisions (pending/approved/rejected, merge target, notes). Edit manually or via future tooling.

## 35k Dataset Import

Import the full strain list from TheVault (`/Volumes/TheVault/full_strains_35000.txt`). Format: `Display Name|slug` (pipe-delimited).

```bash
npm run master-list:import-35k
```

One source line = one raw record. Display name is the raw name; slug is stored in the record and used as the dedupe linking key. Slugs are not added as separate raw records — that prevents canonical inflation (e.g. "Santa Cruz OG" and "831-og" now merge to one canonical).

### Full 35k pipeline (import + image index + launch priority)

```bash
npm run master-list:full-35k-pipeline
```

## Image Linking

After importing and building canonical outputs, scan StrainSpotter/datasets for image folders:

```bash
npm run master-list:build-image-index
```

Then link master list to image availability and produce launch priority:

```bash
npm run master-list:build-launch-priority
```

**Outputs:**
- `image_folder_index.json` — strain folders with image counts
- `image_index_summary.json` — totals and distribution
- `strain_image_link.json` — canonical ↔ image availability
- `image_backed_strains.json` — strains that have image folders
- `launch_priority_5000.json` — top 5,000 strains ranked for launch (has images first, alias count, image count)

## Vault Outputs

| Path | Description |
|------|-------------|
| `master_list/raw_imported_names.json` | All raw names (merged from seed + imports) |
| `master_list/dedupe_candidates.json` | Groups of likely duplicates |
| `master_list/dedupe_review.json` | Review-friendly output, sorted by variant count |
| `master_list/review_state.json` | Review decisions scaffold |
| `master_list/canonical_strains.json` | Canonical list with aliases |
| `master_list/alias_map.json` | Alias → canonical mapping for scanner lookups |
| `master_list/image_folder_index.json` | Strain image folders (from StrainSpotter/datasets) |
| `master_list/image_index_summary.json` | Image folder counts and distribution |
| `master_list/strain_image_link.json` | Master list ↔ image availability |
| `master_list/image_backed_strains.json` | Strains with image folders |
| `master_list/launch_priority_5000.json` | Top 5,000 strains for launch |

## Sample Files

- `master-list/samples/` — Small test files
- `master-list/sources/wiki/batch_wiki_strains.txt` — Larger sample batch
- `master-list/sources/leafly/batch_popular_2024.csv` — Sample CSV
