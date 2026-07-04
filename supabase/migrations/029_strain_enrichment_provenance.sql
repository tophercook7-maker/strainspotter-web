-- 029_strain_enrichment_provenance.sql
--
-- Provenance for the strain-data enrichment engine (scripts/enrich-strains.mjs).
-- The 35k library is mostly empty (11% have descriptions, 7% effects) — the
-- engine fills NULL fields from model knowledge for well-known strains, and
-- every enriched row is stamped so we always know which data came from where.

alter table public.strains
  add column if not exists enriched_at timestamptz,
  add column if not exists enrichment_source text;

notify pgrst, 'reload schema';
