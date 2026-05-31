import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const PROJECT_ROOT = process.cwd();
export const PROJECT_DATA_ROOT = join(PROJECT_ROOT, "data");

function loadDotEnvLocal() {
  const envPath = join(PROJECT_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadDotEnvLocal();

function cleanRoot(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? resolve(trimmed) : null;
}

export function configuredDataRoot() {
  return cleanRoot(process.env.DATA_ENGINE_DATA_ROOT) ?? cleanRoot(process.env.STRAINSPOTTER_DATA_ROOT);
}

export function dataRoot() {
  return configuredDataRoot() ?? PROJECT_DATA_ROOT;
}

export function dataPath(...segments) {
  return join(dataRoot(), ...segments);
}

export function projectDataPath(...segments) {
  return join(PROJECT_DATA_ROOT, ...segments);
}

export function storageInfo() {
  const configuredRoot = configuredDataRoot();
  return {
    root: dataRoot(),
    configuredRoot,
    isExternal: Boolean(configuredRoot),
    configuredMissing: Boolean(configuredRoot && !existsSync(configuredRoot)),
  };
}

export const DATA_PATHS = {
  dataRoot,
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
  embeddingsPath: () => projectDataPath("embeddings", "strain-embeddings.json"),
  prefilteredManifestPath: () => dataPath("review-manifest.prefiltered.json"),
  purpleClusterManifestPath: () => dataPath("review-manifest.purple-cluster.json"),
  prefilterReportPath: () => dataPath("prefilter-report.json"),
  coverageReportPath: () => dataPath("dataset-coverage-report.json"),
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
