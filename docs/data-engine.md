# StrainSpotter Data Engine

The data engine is the workflow for collecting real-world cannabis images, labeling them, reviewing quality, approving reliable examples, rebuilding embeddings, and auditing scanner coverage over time.

It does not change scanner API logic. It manages the data that powers the scanner's visual retrieval layer.

## Folder Structure

- `data/inbox/` — raw incoming images waiting for review.
- `data/real/<strain-slug>/` — approved training images used by `npm run build:embeddings`.
- `data/eval/<strain-slug>/` — holdout test images, never used to build embeddings.
- `data/rejected/` — bad, uncertain, duplicate, AI-generated, or unusable images.
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

## Dataset Quality Rules

- No AI-generated buds or synthetic cannabis images.
- No heavy filters, extreme color grading, or stylized edits.
- No uncertain labels in training.
- Avoid duplicates and near-duplicates.
- Prefer real phone photos and realistic user uploads.
- Include multiple angles, lighting conditions, phenotypes, and close-up distances.
- Keep eval images separate from training images.
- Reject images where plant detail is not visible or packaging/text dominates the frame.

## Practical Blackberry Intake

To add Blackberry now:

1. Save images into `data/inbox/`.
2. Name them `blackberry__user__001.jpg`, `blackberry__user__002.jpg`, and so on.
3. Run `npm run dataset:intake`.
4. Run `npm run dataset:audit`.
5. Rebuild embeddings with `npm run build:embeddings` after the images are approved.
