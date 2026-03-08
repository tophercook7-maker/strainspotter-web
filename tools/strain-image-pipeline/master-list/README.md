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

### Import from external files
```bash
npm run master-list:import -- path/to/strains.txt
npm run master-list:import -- path/to/export.csv path/to/names.json
```

### Rebuild canonical outputs only
```bash
npm run master-list:rebuild
```

## Import Formats

| Format | Description |
|--------|-------------|
| `.txt` | One strain name per line |
| `.csv` | Header row with `name` or `strain` column; or column 0 if no header |
| `.json` | Array of strings, or array of objects with `name`, `strain`, or `strain_name` |

## Import Workflow

1. **Drop a source file** into a known location (e.g. `master-list/samples/` or your data folder).
2. **Run import**:
   ```bash
   npm run master-list:import -- path/to/your_file.txt
   ```
3. **Automatic merge**: New names are merged into `raw_imported_names.json`. Exact duplicates (same raw string) are skipped.
4. **Automatic rebuild**: After import, `dedupe_candidates.json`, `canonical_strains.json`, and `alias_map.json` are regenerated.

## Vault Outputs

| Path | Description |
|------|-------------|
| `master_list/raw_imported_names.json` | All raw names (merged from seed + imports) |
| `master_list/dedupe_candidates.json` | Groups of likely duplicates for review |
| `master_list/canonical_strains.json` | Canonical list with aliases |
| `master_list/alias_map.json` | Alias → canonical mapping for scanner lookups |

## Sample Files

`master-list/samples/` contains sample import files for testing:

- `sample_import.txt` — one name per line
- `sample_import.csv` — CSV with strain_name column
- `sample_import.json` — JSON array (strings + objects)
