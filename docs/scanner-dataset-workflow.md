# Scanner Dataset Workflow

This workflow keeps scanner training data useful, auditable, and safe to deploy.

## 1. Add a New Strain

1. Add the strain to `data/strain-targets.json`.
2. Use a lowercase kebab-case slug, for example `white-widow` or `granddaddy-purple`.
3. Create matching folders:
   - `data/real/<strain-slug>/`
   - `data/eval/<strain-slug>/`
4. Add only verified, real cannabis images to those folders.
5. Run `npm run dataset:audit` and confirm the strain appears in the report.

## 2. Image Collection Targets

For each priority strain, collect:

- 25 approved training images in `data/real/<strain-slug>/`
- 5 holdout eval images in `data/eval/<strain-slug>/`

More images are useful when they show distinct phenotypes, camera qualities, lighting, and angles. Do not pad the dataset with low-quality or repeated images just to hit a number.

## 3. Split Real vs Eval

Use `data/real/<strain-slug>/` for images that are allowed into the embedding dataset.

Use `data/eval/<strain-slug>/` for realistic user-style test images. Eval images must not duplicate training images. The goal is to measure whether the scanner generalizes beyond the exact photos used to build embeddings.

A good split:

- Training: clean, well-labeled coverage of the strain.
- Eval: honest real-world uploads, including moderate variation in lighting and framing.

## 4. Rebuild Embeddings

After adding or removing approved training images, run:

```bash
npm run build:embeddings
```

This reads `data/real/<strain-slug>/` and writes `data/embeddings/strain-embeddings.json`.

Before committing, verify:

- The new strain appears in `data/embeddings/strain-embeddings.json`.
- `imageCount` is greater than 0.
- `averageEmbedding` has the same length as other strains.
- Each `images[].embedding` array exists.

## 5. Run Evaluation

Run:

```bash
npm run eval:embeddings
```

Then inspect:

- `data/embeddings/eval-report.json`
- Console output for top-k accuracy and common confusions

Eval data should stay out of `data/real` so results remain meaningful.

## 6. Decide if a Strain Is Ready

A strain is ready for preview deployment when:

- It has at least 5 real training images.
- It is trending toward the target of 25 training images.
- It has at least 5 eval images for regression testing.
- Eval images usually retrieve the correct strain in top candidates.
- The strain does not only work on near-duplicate training photos.
- Confusions are explainable and not caused by obvious bad labels.

For public confidence, prefer 25+ training images and 5+ eval images before relying on the strain in user-facing claims.

## 7. Bad Data Rules

Do not put these in `data/real`:

- AI-generated buds or synthetic cannabis images.
- Heavy filters, stylized color grading, or extreme edits.
- Screenshots unless cropped cleanly to the actual plant/bud photo.
- Uncertain labels, guesses, mislabeled strains, or mixed-strain batches.
- Duplicate or near-duplicate images.
- Tiny crops where bud structure and trichome detail are not visible.
- Packaging-only, menu-only, text-only, or lab-report-only images.
- Images with large watermarks, UI chrome, captions, or unrelated objects dominating the frame.

Use `data/inbox/` for uncertain incoming material and `data/rejected/` for images that should not be used.

## Routine Commands

```bash
npm run dataset:audit
npm run build:embeddings
npm run eval:embeddings
npx tsc --noEmit
npm run build
```

Run the audit before and after collection work so gaps are visible in `data/dataset-coverage-report.json`.
