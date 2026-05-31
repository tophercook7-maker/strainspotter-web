import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DATA_PATHS, PROJECT_DATA_ROOT, configuredDataRoot } from "./data-paths.mjs";

const FOLDERS = ["inbox", "real", "eval", "rejected", "glossy", "reviewed", "scrape"];
const EXTRA_FOLDERS = ["vault-index", "exports", "backups"];
const moveMode = process.argv.includes("--move");

async function listEntries(path) {
  if (!existsSync(path)) return [];
  return readdir(path);
}

async function copyFolder(name) {
  const source = join(PROJECT_DATA_ROOT, name);
  const destination = join(DATA_PATHS.dataRoot(), name);
  const sourceEntries = await listEntries(source);
  if (!sourceEntries.length) {
    return { name, copied: 0, skipped: true, source, destination };
  }

  await mkdir(destination, { recursive: true });
  await cp(source, destination, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });

  if (moveMode) {
    await rm(source, { recursive: true, force: true });
  }

  return { name, copied: sourceEntries.length, skipped: false, source, destination };
}

async function main() {
  const root = configuredDataRoot();
  if (!root) {
    throw new Error("Set DATA_ENGINE_DATA_ROOT or STRAINSPOTTER_DATA_ROOT before running this script.");
  }

  await mkdir(root, { recursive: true });
  for (const folder of [...FOLDERS, ...EXTRA_FOLDERS]) {
    await mkdir(join(root, folder), { recursive: true });
  }

  console.log("StrainSpotter data move");
  console.log("=======================");
  console.log(`Mode: ${moveMode ? "move" : "copy"}`);
  console.log(`Destination: ${root}`);
  console.log("");

  for (const folder of FOLDERS) {
    const result = await copyFolder(folder);
    if (result.skipped) {
      console.log(`Skipped ${folder}: no local files found at ${result.source}`);
    } else {
      console.log(`Copied ${folder}: ${result.copied} top-level item(s) to ${result.destination}`);
      if (moveMode) console.log(`Removed local ${folder}: ${result.source}`);
    }
  }

  console.log("");
  console.log("Done. Local data was not deleted unless --move was used.");
}

main().catch((error) => {
  console.error("Move to Vault failed:", error);
  process.exit(1);
});
