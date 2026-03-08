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
3. **Dedupe review**: `dedupe_candidates.json` lists groups of variants (e.g. "Blue Dream", "Blue-Dream", "blue dream"). Human review decides which become the canonical name and which become aliases.
4. **Canonical list**: Approved records are written to `canonical_strains.json`.
5. **Alias map**: `alias_map.json` maps each alias → canonical slug for lookups.

## Import Workflow

### Supported formats

- **TXT**: One strain name per line
- **CSV**: Single or multi-column; uses a column named `name` or `strain` if present, otherwise column 0
- **JSON**: Array of strings, or array of objects with `name`, `strain`, or `strain_name` field

### Steps

1. **Drop a raw source file** into a known place (e.g. `tools/strain-image-pipeline/master-list/samples/` or your data folder).
2. **Run the importer**:
   ```bash
   cd tools/strain-image-pipeline
   npm run master-list:import -- path/to/your_file.txt
   ```
3. **Merge + dedupe**: The importer merges new names into `raw_imported_names.json`, skips exact duplicates, and re-runs the dedupe/canonical generation.
4. **Inspect outputs** in `{VAULT_ROOT}/master_list/`:
   - `raw_imported_names.json` — all raw names with optional source metadata
   - `dedupe_candidates.json` — groups for human review
   - `canonical_strains.json` — canonical list
   - `alias_map.json` — alias → canonical mapping

### Duplicate handling

Exact duplicate raw names (same string) are skipped when re-importing. Source file and import timestamp are preserved where available.

## Path to 5,000 Trusted Strain Records

1. Import raw strain names from multiple sources (Wikis, Leafly, AllBud, CSV exports, etc.).
2. Run the import workflow for each source file.
3. Review `dedupe_candidates.json` and adjust canonical choices if needed.
4. Feed the canonical list into the Vault’s `approved/vault_strains` for scanner use.
5. Continue adding sources and re-running import until the master list reaches ~5,000 strains.

## What’s Next After Scaffolding

- Add more import sources (APIs, bulk exports).
- Improve dedupe logic (fuzzy matching, lineage hints).
- Automate alias-map and canonical-list generation from reviewed dedupe output.
- Wire canonical strains into the existing promote pipeline for Supabase ingestion.
