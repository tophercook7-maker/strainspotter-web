# Scanner Data Strategy

StrainSpotter uses two different data sets that should stay separate:

1. Full strain metadata from StrainCompass/TerpScout.
2. Scanner-quality reference images used for visual matching.

Metadata is broad and useful for names, effects, terpenes, THC/CBD ranges, descriptions, and enrichment. It is not automatically good scanner training data. A strain API can contain related strains, autos, crosses, seed packs, marketing images, and aliases that should not be embedded as if they were the exact target strain.

StrainCompass and similar APIs are excellent for **metadata** (names, terpenes, lineage) but **unreliable as a sole source of training photos**: the same stock image file is often attached to many unrelated strains. The pipeline computes **SHA-256 of downloaded bytes** and **disables cross-strain exact duplicates** so embeddings are not dominated by one shared asset masquerading as dozens of strains.

**Highest-trust visual labels** come from **user-confirmed scan photos** promoted via `npm run scanner:training:promote` (`sourceName: user-confirmed-scan`, `reviewStatus: trusted_user_confirmed`). The matcher applies extra weight when nearest embedding neighbors include those references (`scoreBreakdown.userConfirmedReferenceScore`). Confidence remains capped without readable label text.

### Supabase: optional `scans` columns

If saves log `optional scan columns missing`, run the idempotent migration in the Supabase SQL Editor:

`supabase/migrations/add_scan_optional_result_fields.sql`

(Overlapping columns with `add_scan_confidence_fields.sql` are safe because of `IF NOT EXISTS`.)

**What “good” scanner data looks like**

- Prefer **exact cultivar bud photos** that visibly match the target strain label—not generic marketing collages, seed packs, unrelated crosses, autos, or “family” gallery shots unless the canon strain label itself includes those terms.
- **User-confirmed scan images** promoted from training (`user-confirmed-scan` / trusted review state) remain the strongest supervision signal—the matcher boosts these neighbors when present.
- **StrainCompass/API rows** serve as **cold-start seed URLs only** (`straincompass-auto-feed`, medium trust until you review rights and visual fit).
- **Google Custom Search** hits stay **needs-review / low trust** until titles/snippets prove tight alignment; disabled rows are intentional guardrails—not production-approved references.
- **Supabase (`scanner_reference_images`)** mirrors what you deem production-ready locally after download + quality; sync is not an alternative to editorial judgment.

Safer prioritized expansion (**feedback + popularity aware**):

```bash
npm run scanner:recommend
npm run scanner:fill -- --dry-run --limit-strains 10 --target-images 10 --max-new-images 200
```

Full batch (downloads, embeddings, optional Supabase):

```bash
npm run scanner:fill -- --limit-strains 25 --target-images 10 --max-new-images 200 --sync-supabase
```

## Recommended Path

Start with scanner references for the top 50 strains and target 20+ clean images per strain:

```bash
npm run scanner:references:build -- --target-images 20 --limit-strains 50
npm run references:download
npm run references:quality
npm run references:index
npm run references:embeddings
```

Then expand to the top 100 strains once the first set has been reviewed:

```bash
npm run scanner:references:build -- --target-images 20 --limit-strains 100
```

Use full metadata sync separately:

```bash
npm run straincompass:sync -- --limit 100 --offset 0
```

## Single-Strain Workflow

For a specific strain:

```bash
npm run scanner:references:build:strain -- --strain "Afghan Kush" --target-images 20
npm run references:download
npm run references:quality
npm run references:index
npm run references:embeddings
npm run references:audit:strain -- "Afghan Kush"
```

## Quality Rules

More images only help if they are exact and clean. Do not blindly embed every API image.

The scanner reference pipeline rejects or disables suspicious images such as:

- Related autos, crosses, and variants.
- Seed pack, package, logo, placeholder, or marketing images.
- Duplicate images reused across unrelated strains.
- Tiny images.
- Images whose source or filename does not strongly match the target strain.

User feedback images are the highest-quality training data because they connect an uploaded scan to a confirmed correction. Prefer reviewed feedback photos over broad API scraping whenever possible.

