# TheVault external storage (reference & training images)

Large scanner assets can live on an external volume so the project repo stays small. **Application code stays in the repo** (for example `~/Desktop/strainspotter-web`). **Do not** put API keys or `.env` files on the external drive—only image caches and similar blobs.

## Verify the drive

```bash
ls /Volumes
```

Confirm **`TheVault`** appears before running download, index, or embedding scripts that use paths under `/Volumes/TheVault`.

## Create folders

```bash
mkdir -p /Volumes/TheVault/StrainSpotter/reference-images/cache
mkdir -p /Volumes/TheVault/StrainSpotter/reference-images/index
mkdir -p /Volumes/TheVault/StrainSpotter/training-images
```

(`index` is reserved if you later move heavy artifacts; fingerprint and embedding indexes remain in `data/strain-reference-images/` by default so the Next.js app keeps working.)

## Environment variables

Add to **`env/.env.local`** (or your shell environment for CLI scripts):

```bash
REFERENCE_IMAGE_STORAGE_ROOT=/Volumes/TheVault/StrainSpotter/reference-images
SCANNER_TRAINING_STORAGE_ROOT=/Volumes/TheVault/StrainSpotter/training-images
```

Quoted paths are also fine:

```bash
REFERENCE_IMAGE_STORAGE_ROOT="/Volumes/TheVault/StrainSpotter/reference-images"
SCANNER_TRAINING_STORAGE_ROOT="/Volumes/TheVault/StrainSpotter/training-images"
```

If either variable points under **`/Volumes/TheVault`**, scripts call **`lib/server/storagePaths`** helpers which **throw** if the volume is not mounted:

`TheVault external drive is not mounted at /Volumes/TheVault.`

With no env vars set, the app falls back to:

- Reference cache: `data/strain-reference-images/cache/`
- Training images: `data/scanner-training/images/`

## Helper API (server / tooling)

- **`lib/server/storagePaths.ts`** — `getReferenceImageStorageRoot`, `getReferenceImageCacheDir`, `getReferenceIndexDir`, `getTrainingImageStorageRoot`, `ensureStorageDirs`, `resolveReferenceLocalPath`

## Commands

Check roots and free space:

```bash
npm run storage:check
```

### Migrate existing cache to TheVault

After **`REFERENCE_IMAGE_STORAGE_ROOT`** is set and the volume is mounted, copy files from **`data/strain-reference-images/cache/`** into TheVault and rewrite **`localPath`** to absolute paths. A backup is written as **`reference-images.backup-before-thevault-migration.jsonl`** beside **`reference-images.jsonl`**.

```bash
npm run storage:migrate:thevault
```

Optional cleanup (**only after** indexing, embeddings, and scanner checks succeed):

```bash
npm run storage:migrate:thevault -- --delete-originals
```

**Warning:** do not delete originals until the scanner works correctly against absolute TheVault paths.

Download reference images (respects `REFERENCE_IMAGE_STORAGE_ROOT`):

```bash
npm run references:download
```

Rebuild embeddings (indexes stay under `data/strain-reference-images/`):

```bash
npm run references:embeddings
```

## Warnings

- Mount **TheVault** before running **`storage:migrate:thevault`**, **`references:download`**, **`references:index`**, **`references:embeddings`**, **`scanner:auto-feed`**, **`scanner:recalibrate`**, or other download/index/recalibration pipelines when storage env vars point at `/Volumes/TheVault`.
- **`localPath`** in `reference-images.jsonl` may be an **absolute** path when using external reference storage; scanners and scripts resolve both absolute and repo-relative paths.
