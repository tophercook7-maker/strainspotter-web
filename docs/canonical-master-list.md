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

## Path to 5,000 Trusted Strain Records

1. Import raw strain names from multiple sources (Wikis, Leafly, AllBud, etc.).
2. Run the dedupe scaffold; review and approve groups.
3. Promote approved records to the canonical list.
4. Feed the canonical list into the Vault’s `approved/vault_strains` for scanner use.
5. Continue adding sources and re-running dedupe until the master list reaches ~5,000 strains.

## What’s Next After Scaffolding

- Add more import sources (e.g. structured APIs, CSV exports).
- Improve dedupe logic (fuzzy matching, lineage hints).
- Automate alias-map and canonical-list generation from reviewed dedupe output.
- Wire canonical strains into the existing promote pipeline for Supabase ingestion.
