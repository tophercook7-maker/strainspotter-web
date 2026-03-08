# Canonical Strain Master List

Scaffolding for a 5,000-strain master list with alias/dedupe support. Feeds the Vault and eventual promotion into approved data.

## Record Shapes

- **Canonical**: `canonical-strain-record.ts` — slug, canonical_name, aliases, type, lineage, source_records, review_status
- **Raw import**: `raw-import-record.ts` — messy source names before approval

## Dedupe Workflow

1. **Ingest raw names** into a file (one per line or JSON array)
2. **Run dedupe scaffold**:
   ```bash
   npx ts-node dedupe-scaffold.ts raw-names.txt
   # or from stdin:
   cat sources.txt | npx ts-node dedupe-scaffold.ts -
   ```
3. **Review output** in `{VAULT_ROOT}/master_list/dedupe_candidates.json`
4. **Edit manually** to merge/approve groups; then promote to canonical list and alias map

## Vault Outputs

| Path | Description |
|------|-------------|
| `master_list/dedupe_candidates.json` | Groups of likely duplicates for human review |
| `master_list/raw_imported_names.json` | Raw names as ingested |
| `master_list/canonical_strains.json` | Canonical list (populated after review) |
| `master_list/alias_map.json` | Alias → canonical mapping (populated after review) |
