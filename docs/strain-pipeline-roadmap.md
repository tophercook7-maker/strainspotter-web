# Strain Database Pipeline — Step-by-Step Roadmap

Companion to [strain-database-pipeline-plan.md](./strain-database-pipeline-plan.md).

---

## Immediate Next Steps (No Breaking Changes)

| Step | Task | Notes |
|------|------|-------|
| 1 | Review schema proposal | Read `docs/strain-pipeline-schema-proposal.sql` |
| 2 | Apply Phase 1 migrations (optional) | Run SQL in Supabase SQL Editor; test in staging first |
| 3 | Add manual ingestion script stub | `scripts/ingest-from-vault.ts` — placeholder that documents the flow |
| 4 | Document vault_match_images contract | Ensure RPC exists and returns expected shape for judge route |

---

## MVP Milestone (100–500 strains)

1. **Schema:** Apply proposal migrations 1–5 (no vault_image_embeddings yet).
2. **Ingestion:** Manual script reads TheVault paths; inserts `strain_source_records` + `vault_strains` + `vault_strain_images`.
3. **Validation:** Scanner judge route returns real matches for seeded strains.
4. **No AI extraction** in MVP — only structured, known-good data.

---

## Second Milestone (1,000 strains)

1. **Extraction table:** `strain_source_extractions` in use.
2. **Grok integration:** Extraction job calls Grok → writes to `strain_source_extractions`.
3. **Review flow:** CLI or minimal admin to approve/reject; on approve → insert canonical.
4. **Provenance:** Every strain links to `strain_source_records`.

---

## Scale-Up (5,000 strains × 20 images)

1. **Normalization engine:** Slug rules, dedup logic.
2. **Batch approval:** Trusted sources get batch approve.
3. **Image quality:** Optional ML scoring.
4. **Embeddings:** Backfill `vault_image_embeddings` for all images.

---

## Where Grok Helps vs Does Not

| Use Grok | Do NOT use Grok |
|----------|-----------------|
| Extract strain name from text | Insert into vault_strains |
| Propose slug from name | Final dedup decisions |
| Suggest merge conflicts | Approval/rejection |
| Caption images for embedding | Source of truth |
