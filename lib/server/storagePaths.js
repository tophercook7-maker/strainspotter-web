/**
 * Reference/training image roots — optional external volume (TheVault).
 * Node / CLI runtime. See storagePaths.ts for TypeScript re-exports.
 */

const fs = require("node:fs");
const path = require("node:path");

const THEVAULT_MOUNT = "/Volumes/TheVault";

const CATALOG_REL = path.join(
  "data",
  "strain-reference-images",
  "reference-images.jsonl"
);

/**
 * Walk upward from a directory until we find strain-reference-images catalog.
 * Needed when `process.cwd()` is a parent folder (multiple lockfiles / monorepo) or when
 * this file is bundled under `.next/` and `../..` no longer points at the repo root.
 */
function findRepoRootContainingCatalog(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 32; i++) {
    try {
      if (fs.existsSync(path.join(dir, CATALOG_REL))) return dir;
    } catch {
      /* ignore */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Repo root for data/strain-reference-images and relative JSONL paths.
 */
function projectRoot() {
  const env = process.env.STRAINSPOTTER_WEB_ROOT?.trim();
  if (env && fs.existsSync(path.join(path.resolve(env), CATALOG_REL))) {
    return path.resolve(env);
  }

  const fromCwd = findRepoRootContainingCatalog(process.cwd());
  if (fromCwd) return fromCwd;

  const fromHere = findRepoRootContainingCatalog(__dirname);
  if (fromHere) return fromHere;

  return process.cwd();
}

function configuredUsesTheVault(p) {
  if (!p || typeof p !== "string") return false;
  const norm = p.replace(/\\/g, "/");
  return norm === THEVAULT_MOUNT || norm.startsWith(`${THEVAULT_MOUNT}/`);
}

function assertTheVaultMountedIfNeeded() {
  const ref = process.env.REFERENCE_IMAGE_STORAGE_ROOT?.trim();
  const train = process.env.SCANNER_TRAINING_STORAGE_ROOT?.trim();
  if (configuredUsesTheVault(ref) || configuredUsesTheVault(train)) {
    if (!fs.existsSync(THEVAULT_MOUNT)) {
      throw new Error("TheVault external drive is not mounted at /Volumes/TheVault.");
    }
  }
}

function getReferenceImageStorageRoot() {
  assertTheVaultMountedIfNeeded();
  const env = process.env.REFERENCE_IMAGE_STORAGE_ROOT?.trim();
  if (env) return path.resolve(env);
  return path.join(projectRoot(), "data", "strain-reference-images");
}

function getReferenceImageCacheDir() {
  return path.join(getReferenceImageStorageRoot(), "cache");
}

/** Raw lake subtree under the reference storage root (TheVault or repo). */
function getReferenceImageLakeRawRoot() {
  return path.join(getReferenceImageStorageRoot(), "raw");
}

function getReferenceIndexDir() {
  return path.join(getReferenceImageStorageRoot(), "index");
}

function getTrainingImageStorageRoot() {
  assertTheVaultMountedIfNeeded();
  const env = process.env.SCANNER_TRAINING_STORAGE_ROOT?.trim();
  if (env) return path.resolve(env);
  return path.join(projectRoot(), "data", "scanner-training", "images");
}

function ensureStorageDirs() {
  assertTheVaultMountedIfNeeded();
  fs.mkdirSync(getReferenceImageCacheDir(), { recursive: true });
  fs.mkdirSync(getReferenceImageLakeRawRoot(), { recursive: true });
  fs.mkdirSync(getReferenceIndexDir(), { recursive: true });
  fs.mkdirSync(getTrainingImageStorageRoot(), { recursive: true });
  return {
    referenceRoot: getReferenceImageStorageRoot(),
    cacheDir: getReferenceImageCacheDir(),
    rawLakeDir: getReferenceImageLakeRawRoot(),
    indexDir: getReferenceIndexDir(),
    trainingRoot: getTrainingImageStorageRoot(),
  };
}

/**
 * Resolve a JSONL localPath to an absolute filesystem path.
 * @param {string} localPath
 * @param {string} [projRoot]
 */
function resolveReferenceLocalPath(localPath, projRoot = projectRoot()) {
  if (!localPath || typeof localPath !== "string") return "";
  const t = localPath.trim();
  if (!t) return "";
  if (path.isAbsolute(t)) return path.normalize(t);
  return path.normalize(path.join(projRoot, ...t.split(/[/\\]/).filter(Boolean)));
}

function isTheVaultPath(absPath) {
  if (!absPath || typeof absPath !== "string") return false;
  return configuredUsesTheVault(absPath.replace(/\\/g, "/"));
}

module.exports = {
  THEVAULT_MOUNT,
  projectRoot,
  assertTheVaultMountedIfNeeded,
  getReferenceImageStorageRoot,
  getReferenceImageCacheDir,
  getReferenceImageLakeRawRoot,
  getReferenceIndexDir,
  getTrainingImageStorageRoot,
  ensureStorageDirs,
  resolveReferenceLocalPath,
  isTheVaultPath,
};
