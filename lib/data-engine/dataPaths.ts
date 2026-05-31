import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = process.cwd();
const PROJECT_DATA_ROOT = join(PROJECT_ROOT, "data");

function cleanRoot(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? resolve(trimmed) : null;
}

export function configuredDataRoot() {
  return cleanRoot(process.env.DATA_ENGINE_DATA_ROOT) ?? cleanRoot(process.env.STRAINSPOTTER_DATA_ROOT);
}

export function dataRoot() {
  return configuredDataRoot() ?? PROJECT_DATA_ROOT;
}

export function projectDataPath(...segments: string[]) {
  return join(PROJECT_DATA_ROOT, ...segments);
}

export function dataPath(...segments: string[]) {
  return join(dataRoot(), ...segments);
}

export function dataStorageInfo() {
  const configured = configuredDataRoot();
  const root = dataRoot();
  const configuredMissing = Boolean(configured && !existsSync(configured));
  return {
    root,
    inboxPath: dataPath("inbox"),
    configuredRoot: configured,
    isExternal: Boolean(configured),
    configuredMissing,
    label: configured ? "TheVault" : "Project folder",
    message: configured
      ? "Images and scrape results are being saved outside the app folder."
      : "Images and scrape results are being saved in the project data folder.",
  };
}

export const dataEnginePaths = {
  projectRoot: PROJECT_ROOT,
  projectDataRoot: PROJECT_DATA_ROOT,
  dataRoot,
  dataPath,
  projectDataPath,
  inboxDir: () => dataPath("inbox"),
  realDir: () => dataPath("real"),
  evalDir: () => dataPath("eval"),
  rejectedDir: () => dataPath("rejected"),
  glossyDir: () => dataPath("glossy"),
  reviewedDir: () => dataPath("reviewed"),
  scrapeDir: () => dataPath("scrape"),
  vaultIndexDir: () => dataPath("vault-index"),
  vaultIndexPath: () => dataPath("vault-index.json"),
  reviewManifestPath: () => dataPath("review-manifest.json"),
  purpleClusterManifestPath: () => dataPath("review-manifest.purple-cluster.json"),
  prefilteredManifestPath: () => dataPath("review-manifest.prefiltered.json"),
  prefilterReportPath: () => dataPath("prefilter-report.json"),
  coverageReportPath: () => dataPath("dataset-coverage-report.json"),
  normalizedCatalogPath: () => dataPath("normalized-strain-catalog.json"),
  metadataCandidatesPath: () => dataPath("scrape", "metadata-candidates.json"),
  imageCandidatesPath: () => dataPath("scrape", "image-candidates.json"),
  reviewPreferencesPath: () => dataPath("scrape", "review-preferences.json"),
  scrapeRunsPath: () => dataPath("scrape", "scrape-runs.json"),
  sourceErrorsPath: () => dataPath("scrape", "source-errors.json"),
  scrapeStatusPath: () => dataPath("scrape", "scrape-status.json"),
  strainTargetsPath: () => projectDataPath("strain-targets.json"),
  sourceRegistryPath: () => projectDataPath("source-registry.json"),
  scrapeTargetsPath: () => projectDataPath("scrape-targets.json"),
};
