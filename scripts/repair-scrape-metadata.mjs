import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { DATA_PATHS } from "./data-paths.mjs";

const CANDIDATES_PATH = DATA_PATHS.imageCandidatesPath();
const INBOX_DIR = DATA_PATHS.inboxDir();

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function candidateFilePath(candidate) {
  const fileName = String(candidate?.fileName ?? "").trim();
  return fileName ? join(INBOX_DIR, basename(fileName)) : null;
}

async function readCandidates() {
  if (!existsSync(CANDIDATES_PATH)) return [];
  const value = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));
  return Array.isArray(value) ? value : [];
}

async function main() {
  await mkdir(dirname(CANDIDATES_PATH), { recursive: true });
  const candidates = await readCandidates();
  const backupPath = join(dirname(CANDIDATES_PATH), `image-candidates.backup.${timestampSlug()}.json`);
  await writeFile(backupPath, JSON.stringify(candidates, null, 2) + "\n", "utf8");

  const validCandidates = [];
  const staleCandidates = [];

  for (const candidate of candidates) {
    const filePath = candidateFilePath(candidate);
    if (filePath && existsSync(filePath)) {
      validCandidates.push(candidate);
    } else {
      staleCandidates.push(candidate);
    }
  }

  await writeFile(CANDIDATES_PATH, JSON.stringify(validCandidates, null, 2) + "\n", "utf8");

  console.log(`Inbox path: ${INBOX_DIR}`);
  console.log(`Candidates path: ${CANDIDATES_PATH}`);
  console.log(`Backup written: ${backupPath}`);
  console.log(`Total candidates: ${candidates.length}`);
  console.log(`Valid candidates: ${validCandidates.length}`);
  console.log(`Stale candidates removed: ${staleCandidates.length}`);
}

main().catch((error) => {
  console.error("Failed to repair scrape metadata:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
