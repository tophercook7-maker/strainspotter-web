# Scanner Training Images

This folder is reserved for future photo-to-photo matching and embedding work.
Use real, labeled examples only.

Suggested structure:

```text
backend/data/training-images/
  blue-dream/
    image_001.jpg
    image_002.jpg
    metadata.json
  og-kush/
    image_001.jpg
    metadata.json
```

Each `metadata.json` should describe the label source, strain name, image
provenance, and any known capture details.

Do not commit huge image sets unless that is intentional for the branch. For
large datasets, keep the files in external storage and commit only manifests or
small representative samples.
