# Scanner Image Dataset

This directory holds the image data used to train and evaluate StrainSpotter's visual retrieval layer.

## Folder Layout

- `data/real/<strain-slug>/` — approved training images used when building `data/embeddings/strain-embeddings.json`.
- `data/eval/<strain-slug>/` — holdout evaluation images. These are never used to build embeddings.
- `data/inbox/` — unsorted incoming images awaiting review, labeling, deduping, and assignment.
- `data/rejected/` — bad, duplicate, uncertain, synthetic, or otherwise unusable images.
- `data/embeddings/` — generated embedding artifacts and evaluation reports.

## Strain Folder Names

Use lowercase kebab-case slugs that match `data/strain-targets.json`.

Examples:

- `blue-dream`
- `white-widow`
- `granddaddy-purple`
- `girl-scout-cookies`

Do not mix display names, spaces, underscores, or alternate spellings in folder names.

## Good Training Images

Use real bud or plant photos with a trustworthy label. The best images usually have:

- Sharp focus on the flower or relevant plant structure.
- Close-up framing where the plant material fills most of the frame.
- Bright, even lighting with color and trichome detail visible.
- Multiple angles, phenotypes, and lighting conditions per strain.
- Original photos or clean crops from known-good sources.

Aim for at least 25 approved training images per priority strain.

## Eval Images

Eval images should represent realistic user uploads and should not duplicate training images. Keep at least 5 eval images per priority strain.

Use eval images to catch regressions before deploying new embeddings.

## Reject Images

Move images to `data/rejected/` when they are:

- AI-generated or synthetic.
- Uncertainly labeled or mislabeled.
- Screenshots with UI chrome, captions, watermarks, or heavy compression.
- Duplicate or near-duplicate copies of an image already in `data/real`.
- Tiny crops, blurry photos, or images where flower detail is not visible.
- Heavily filtered, color-shifted, or stylized.
- Non-cannabis, packaging-only, menu-only, or text-only images.

When unsure, keep the image out of `data/real` until it can be verified.
