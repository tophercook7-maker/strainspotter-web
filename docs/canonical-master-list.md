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

## Path to 5,000 Trusted Strain Records

1. Drop source files into `sources/` (by vendor or library).
2. Run `npm run master-list:bulk-import`.
3. Review `dedupe_review.json` and adjust canonical choices if needed.
4. Feed the canonical list into the Vault’s `approved/vault_strains` for scanner use.
5. Continue adding sources and re-running bulk import until the master list reaches ~5,000 strains.
