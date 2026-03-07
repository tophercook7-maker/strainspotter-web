# Strain Image Ingestion — Implementation Plan

**Target:** 5,000 strains; up to 100,000 raw candidate images before Apple launch.  
**Principle:** Raw scraped images never go straight to production. All content flows: raw → staging → review → approved.

---

## 1. Implementation Plan (Plain English)

### What We're Building

A high-volume image ingestion pipeline that:

1. **Collects** raw candidate images from structured sources (breeders, seed banks, strain libraries).
2. **Stores** them in the local Vault drive under `raw_sources/`.
3. **Classifies** images as bud, whole_plant, leaf, trichome, or packaging.
4. **Scores** them for quality (blur, resolution, brightness) and rejects failures.
5. **Deduplicates** using perceptual hashing.
6. **Promotes** only approved images into the reference layer.

### Flow

```
Sources → raw_sources → staging/candidate_strain_images → review_queue → approved
                ↓
         raw_sources/rejected (quality failures)
```

### What We Do NOT Do

- Mass-scrape without pipeline structure
- Trust raw scraped images in production
- Mirror third-party images into production tables without review
- Invent fake strain data

---

## 2. Recommended Folder / Module Structure

```
tools/strain-image-pipeline/
├── config.ts                 # Paths, limits, thresholds
├── types.ts                  # Shared types
├── source_queue.ts           # Strain list and source URL queue
├── page_fetch.ts             # Fetch HTML/JSON (robots.txt, throttle)
├── metadata_extraction.ts    # Extract strain metadata from raw
├── image_url_extraction.ts   # Extract image URLs from pages
├── download_images.ts        # Download images to raw_sources
├── image_classifier.ts       # Classify bud/whole_plant/leaf/etc.
├── image_quality_check.ts    # Blur, resolution, brightness filter
├── image_dedupe.ts           # Perceptual hash deduplication
├── review_queue_output.ts    # Write candidates to review_queue
├── promote.ts                # Promote approved to approved/
├── pipeline_runner.ts        # Orchestrate full pipeline
├── MODULES.md                # Module responsibilities
├── package.json
└── README.md
```

---

## 3. Review / Approval Flow

1. **Automated:** Quality + dedupe → staging
2. **Review queue:** Staging candidates written to `review_queue/images/` with metadata
3. **Human/CLI:** Approve or reject each candidate
4. **Promotion:** Approved images copied to `approved/strain_reference_images/{type}/`
5. **Supabase:** Approved images can later be synced to `strain_reference_images` or `vault_strain_images` for scanner use

---

## 4. Roadmap to 100,000 Raw Images

| Stage | Raw Images | Strains | Focus |
|-------|------------|---------|-------|
| 1 | 5k–10k | 500 | Prove pipeline, fix bottlenecks |
| 2 | 50k–75k | 5,000 | Scale; batch review; Apple launch |
| 3 | 50k+ staging | — | Tune dedupe, quality |
| 4 | 100k raw | 5,000+ | High-volume stable |

---

## 5. Suggested Next Coding Tasks

1. **Implement `page_fetch.ts`** — Real fetch with robots.txt parsing and throttling.
2. **Implement `image_url_extraction.ts`** — Parse HTML/JSON for image URLs.
3. **Wire `source_queue` into `pipeline_runner`** — Use queue for strain list.
4. **Add review queue manifest** — JSON manifest in `review_queue/images/` for each run.
5. **Add promote-from-review** — Script to promote approved IDs from manifest to `approved/`.
6. **Integrate one safe source** — E.g. a single allowed domain for a small test batch.
7. **Add pipeline logging** — Write run stats to `logs/` with timestamps.
