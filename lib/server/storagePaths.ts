/**
 * Reference/training storage roots (optional TheVault external drive).
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const impl = require("./storagePaths.js") as {
  THEVAULT_MOUNT: string;
  projectRoot: () => string;
  assertTheVaultMountedIfNeeded: () => void;
  getReferenceImageStorageRoot: () => string;
  getReferenceImageCacheDir: () => string;
  getReferenceImageLakeRawRoot: () => string;
  getReferenceIndexDir: () => string;
  getTrainingImageStorageRoot: () => string;
  ensureStorageDirs: () => {
    referenceRoot: string;
    cacheDir: string;
    rawLakeDir: string;
    indexDir: string;
    trainingRoot: string;
  };
  resolveReferenceLocalPath: (localPath: string, projRoot?: string) => string;
  isTheVaultPath: (absPath: string) => boolean;
};

export const THEVAULT_MOUNT = impl.THEVAULT_MOUNT;
export const projectRoot = impl.projectRoot;
export const assertTheVaultMountedIfNeeded = impl.assertTheVaultMountedIfNeeded;
export const getReferenceImageStorageRoot = impl.getReferenceImageStorageRoot;
export const getReferenceImageCacheDir = impl.getReferenceImageCacheDir;
export const getReferenceImageLakeRawRoot = impl.getReferenceImageLakeRawRoot;
export const getReferenceIndexDir = impl.getReferenceIndexDir;
export const getTrainingImageStorageRoot = impl.getTrainingImageStorageRoot;
export const ensureStorageDirs = impl.ensureStorageDirs;
export const resolveReferenceLocalPath = impl.resolveReferenceLocalPath;
export const isTheVaultPath = impl.isTheVaultPath;
