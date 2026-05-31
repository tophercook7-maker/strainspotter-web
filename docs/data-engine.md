# StrainSpotter Data Engine

The data engine is the workflow for collecting real-world cannabis images, labeling them, reviewing quality, approving reliable examples, rebuilding embeddings, and auditing scanner coverage over time.

It does not change scanner API logic. It manages the data that powers the scanner's visual retrieval layer.

## Folder Structure

- `data/inbox/` — raw incoming images waiting for review.
- `data/real/<strain-slug>/` — approved training images used by `npm run build:embeddings`.
- `data/eval/<strain-slug>/` — holdout test images, never used to build embeddings.
- `data/rejected/` — bad, uncertain, duplicate, AI-generated, or unusable images.
- `data/glossy/` — quarantined glossy/catalog-style images that should not train the scanner by default.
- `data/reviewed/` — optional staging area for reviewed but not yet embedded images.
- `data/embeddings/` — generated embedding artifacts and eval reports.

## File Naming

For direct intake, name files:

```text
<strain-slug>__<source>__<number>.<extension>
```

Examples:

```text
blackberry__user__001.jpg
purple-afghan__reddit__014.webp
white-widow__dispensary__003.png
```

Supported extensions are `.jpg`, `.jpeg`, `.png`, and `.webp`.

Use lowercase kebab-case strain slugs. Keep the source short and descriptive, such as `user`, `reddit`, `dispensary`, `grower`, or `vendor`.

## Add Inbox Images

1. Place incoming images in `data/inbox/`.
2. Use the direct intake filename format when the label is already trusted.
3. Leave uncertain images in `data/inbox/` until a review manifest is created.

## Index the Vault

To index Topher's external drive or Vault dataset without copying files:

```bash
npm run dataset:index-vault -- --root "/Volumes/Vault/path"
```

This recursively scans for `.jpg`, `.jpeg`, `.png`, and `.webp` files, skips hidden files, guesses a strain slug from the parent folder or filename, and writes `data/vault-index.json`.

The indexer does not modify or copy Vault files.

## Review Images Visually

Run the app locally and open:

```text
/garden/data-engine
```

The dashboard is local/dev oriented and disabled in production builds. It shows:

- Total indexed Vault images.
- Approved training image count.
- Eval image count.
- Rejected image count.
- Target strain coverage from `data/strain-targets.json` and `data/dataset-coverage-report.json`.
- A review queue from `data/vault-index.json` plus images in `data/inbox/`.
- Thumbnail previews, guessed strain filters, quality warnings, and review buttons.

Review buttons write decisions to `data/review-manifest.json`.

## Approve or Reject Images

Use the dashboard buttons:

- `Approve training` for high-confidence images that should go to `data/real/<strain-slug>/`.
- `Approve eval` for holdout images that should go to `data/eval/<strain-slug>/`.
- `Reject` for bad, uncertain, duplicate, AI-looking, heavily filtered, packaging-only, blurry, or badly cropped images.

Reject reason options include:

- blurry
- artificial / AI-looking
- glossy catalog image
- studio lighting
- overprocessed / filtered
- generic frosty stock photo
- heavy filter
- bad crop
- uncertain label
- duplicate
- packaging only

## Intake Simple Labeled Images

Run:

```bash
npm run dataset:intake
```

The script scans `data/inbox/`, validates filenames, creates `data/real/<strain-slug>/`, and moves valid images into the approved training set. Invalid filenames stay in the inbox and are reported. If a destination filename already exists, the script appends a safe `-dup-N` suffix.

## Use Review Manifest

Copy `data/review-manifest.example.json` to `data/review-manifest.json` and fill in reviewed decisions:

- `approvedForTraining: true` moves the image to `data/real/<strainSlug>/`.
- `approvedForEval: true` moves the image to `data/eval/<strainSlug>/`.
- If neither is true, the image moves to `data/rejected/`.

Run:

```bash
npm run dataset:review
```

The script reads `data/review-manifest.json`, moves files out of `data/inbox/`, creates missing folders, skips missing files with warnings, and avoids overwrites with safe duplicate suffixes.

If a manifest item references a Vault `filePath`, the review script copies the file into `data/real`, `data/eval`, or `data/rejected`. It never deletes or moves source files from the Vault.

## Rebuild Embeddings

After approving training images, run:

```bash
npm run build:embeddings
```

This rebuilds `data/embeddings/strain-embeddings.json` from `data/real/<strain-slug>/`.

## Audit Coverage

Run:

```bash
npm run dataset:audit
```

The audit counts training and eval images, compares coverage against `data/strain-targets.json`, writes `data/dataset-coverage-report.json`, and prints the strongest and weakest strain coverage in the terminal.

## Evaluate Embeddings

If eval data exists, run:

```bash
npm run eval:embeddings
```

Keep eval images separate from training so this remains a real holdout test.

## Allowlisted Scraping Policy

Scraping is intentionally conservative. Use it only for sources that are explicitly allowed by the user and permitted by the source's license, API, terms, and robots policy.

Create `data/source-allowlist.json` from `data/source-allowlist.example.json`, then enable only permitted sources:

```bash
npm run dataset:scrape
```

The scraper:

- Only processes sources with `enabled: true`.
- Skips sources whose license notes do not confirm permission.
- Fetches only pages listed in the allowlist.
- Respects `rateLimitMs`.
- Checks `robots.txt` and skips blocked pages.
- Downloads only same-origin images from allowlisted pages.
- Writes files to `data/inbox/` using `<strain-slug>__<source-name>__001.jpg` style names.
- Writes `data/scrape-log.json` with source URL and license notes metadata.

Do not use this for private/protected content, login-required pages, private social media content, or sources without permission.

## Scraper V2 Source Registry

Scraper V2 is the repeatable acquisition system for scaling beyond the local Vault. It is disabled by default and review-first by design.

Sources live in:

```text
data/source-registry.json
```

Every source must declare:

- `enabled`: only `true` sources are processed.
- `sourceType`: `metadata`, `images`, or `metadata-and-images`.
- `allowedUse`: use `review-required`.
- `licenseNotes`: document the permission, terms, API allowance, or license basis.
- `robotsPolicy`: must be `respect`.
- `rateLimitMs`: wait time between requests.
- `maxPagesPerRun`: hard cap for each run.
- `selectors`: extraction selectors for metadata links, metadata fields, and image URLs.
- `seedUrls`: explicit starting pages.

Example sources in the registry are intentionally disabled. Do not enable real sources until permission, terms, robots rules, and rate limits have been reviewed.

## Validate Scrape Sources

Before scraping, run:

```bash
npm run scrape:validate
```

The validator checks enabled and disabled sources, required fields, missing selectors, license notes, rate limits, seed URLs, and robots accessibility for enabled sources. It writes:

```text
data/scrape/source-validation-report.json
```

Sources with vague license notes like "only enable if..." should stay disabled.

## Run Metadata Scrape

After a permitted source is enabled and validates, run:

```bash
npm run scrape:metadata
```

The metadata scraper:

- Reads `data/source-registry.json`.
- Processes only enabled metadata-capable sources.
- Checks `robots.txt` before scraping URLs.
- Respects `rateLimitMs` and `maxPagesPerRun`.
- Extracts strain metadata candidates from configured selectors.
- Dedupe candidates by `slug + sourceUrl`.
- Writes candidates to `data/scrape/metadata-candidates.json`.
- Appends run summaries to `data/scrape/scrape-runs.json`.
- Logs errors to `data/scrape/source-errors.json`.

Metadata candidates are not trusted records yet. They are candidates for review and future curation.

## Normalize Strain Catalog

After metadata candidates are collected, normalize them into the catalog layer:

```bash
npm run catalog:normalize
```

The normalizer reads:

- `data/scrape/metadata-candidates.json`
- `lib/data/strains.json`
- `data/strain-targets.json`

It writes:

```text
data/normalized-strain-catalog.json
```

The normalized catalog merges records by slug, preserves aliases, normalizes type to `Indica`, `Sativa`, `Hybrid`, or `Unknown`, collects effects/flavors/lineage arrays, keeps source references, assigns a confidence level, and defaults records to `reviewStatus: "candidate"`.

Confidence is intentionally conservative:

- `high` means multiple metadata sources agree and useful details are present.
- `medium` means one source has useful details, or the strain matches an existing catalog/priority target with useful details.
- `low` means the record is weak, incomplete, or only exists as a target shell.

## Review Catalog

The dashboard shows normalized catalog stats:

- Total normalized catalog count.
- Candidate count.
- Approved count.
- Metadata candidate count.
- Top priority targets that still lack real existing-catalog or metadata-candidate coverage.

For now, catalog review is represented by `reviewStatus` in `data/normalized-strain-catalog.json`. Keep records as `candidate` until names, aliases, type, lineage, effects, flavors, and source references are trustworthy enough to approve.

The intended order is:

1. Scrape metadata from allowlisted sources.
2. Normalize the catalog.
3. Review and approve catalog records.
4. Only then connect images, eval data, and embeddings.

## Run Image Candidate Scrape

After metadata candidates exist, or when an enabled image source has explicit `seedUrls`, run:

```bash
npm run scrape:images
```

The image scraper:

- Processes only enabled image-capable sources.
- Checks `robots.txt` for pages and images.
- Respects rate limits and page caps.
- Extracts image URLs only from configured pages/selectors.
- Downloads image candidates into `data/inbox/`.
- Names files as `<strain-slug>__<source-id>__<number>.jpg`.
- Writes source/license metadata to `data/scrape/image-candidates.json`.

Each image candidate is saved with `reviewStatus: "pending"` and `recommendedAction: "review"`. Scraped images never go directly into `data/real/` or embeddings.

## Scrape Candidate Review

Scraped images enter the same review-first workflow as Vault and inbox images:

1. Open `/garden/data-engine`.
2. Review image candidates visually.
3. Reject glossy/catalog/studio/uncertain images.
4. Approve only high-confidence images for training or eval.
5. Run `npm run dataset:review`.
6. Rebuild embeddings only after review with `npm run build:embeddings`.

The dashboard shows local scrape stats from JSON files only:

- Metadata candidate count.
- Image candidate count.
- Last scrape run.
- Enabled sources.
- Source errors.
- Warning when no scrape sources are enabled.

This keeps the dashboard fast and avoids remote network calls during normal review.

## Why Scraped Images Do Not Train Automatically

Large-scale web data can be mislabeled, copyrighted, overprocessed, duplicated, AI-generated, or visually unlike real user uploads. Automatically training on it would make scanner accuracy worse.

The safe path is:

1. Metadata first.
2. Image candidates second.
3. Source/license tracking always.
4. Human review and quality filters before training.
5. Eval images kept separate from training.

## Dataset Quality Rules

- No AI-generated buds or synthetic cannabis images.
- No heavy filters, extreme color grading, or stylized edits.
- No uncertain labels in training.
- Avoid duplicates and near-duplicates.
- Prefer real phone photos and realistic user uploads.
- Include multiple angles, lighting conditions, phenotypes, and close-up distances.
- Keep eval images separate from training images.
- Reject images where plant detail is not visible or packaging/text dominates the frame.

Training data should prioritize:

- Real phone photos.
- Natural lighting.
- Varied angles and distances.
- User-submitted or grower-provided photos with trustworthy labels.
- Real-world images that look like what scanner users will upload.

Avoid or keep separate:

- Glossy breeder photos.
- Catalog photos.
- Overprocessed photos.
- Studio-lit product photos.
- Stock-looking frosty bud shots.

These catalog-style images can bias the scanner toward generic frosty strains like White Widow and reduce real-world accuracy. Keep them in `data/glossy/` or `data/rejected/` unless deliberately testing catalog-photo behavior. Do not use glossy images in embeddings by default.

## Dataset Goals

Five thousand strains is a long-term goal. The launch target should be 25-100 strong strains first, with enough high-quality real and eval images to support trustworthy retrieval.

Prioritize look-alike clusters before breadth:

- Purple strains.
- OG/Kush family.
- Dessert strains.
- Sativa classics.

## 5,000-10,000 Strain Roadmap

Scale in stages:

1. Build a broad metadata catalog first so every strain has normalized names, aliases, type, lineage, effects, flavors, and source references.
2. Add image candidates only from allowlisted, permitted sources with source/license metadata.
3. Treat user submissions, grower-provided images, and Vault photos as the highest-value visual data because they better match real scanner uploads.
4. Keep catalog, breeder, and glossy images quarantined unless deliberately testing catalog-photo behavior.
5. Require review/quality gates before embeddings.
6. Grow from strong clusters first, then broaden: purple look-alikes, OG/Kush, dessert strains, and sativa classics.
7. Track coverage with `npm run dataset:audit` and rebuild embeddings only after approved training data changes.

## Practical Blackberry Intake

To add Blackberry now:

1. Save images into `data/inbox/`.
2. Name them `blackberry__user__001.jpg`, `blackberry__user__002.jpg`, and so on.
3. Run `npm run dataset:intake`.
4. Run `npm run dataset:audit`.
5. Rebuild embeddings with `npm run build:embeddings` after the images are approved.
