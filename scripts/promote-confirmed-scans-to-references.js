#!/usr/bin/env node

/**
 * Promote user-confirmed scans from data/scanner-training/confirmed-scans.jsonl
 * into data/strain-reference-images/reference-images.jsonl as trusted references.
 */

const fs = require("node:fs");
const path = require("node:path");
const { referenceJsonlPath, readJsonl } = require("./reference-utils");

const root = path.resolve(__dirname, "..");
const confirmedPath = path.join(root, "data", "scanner-training", "confirmed-scans.jsonl");

function readConfirmed() {
  if (!fs.existsSync(confirmedPath)) return [];
  return fs
    .readFileSync(confirmedPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  const confirmed = readConfirmed();
  const existingRows = readJsonl(referenceJsonlPath);
  const dedupe = new Set();
  for (const row of existingRows) {
    const slug = row.strainSlug || "";
    const hash = row.contentHash || "";
    if (slug && hash) dedupe.add(`${slug}::${hash}`);
  }

  let promoted = 0;
  let skipped = 0;

  const outLines = [];
  for (const row of confirmed) {
    const strainSlug = typeof row.correctStrainSlug === "string" ? row.correctStrainSlug : "";
    const strainName =
      typeof row.correctStrainName === "string" ? row.correctStrainName : strainSlug;
    const localPath = typeof row.imageLocalPath === "string" ? row.imageLocalPath : "";
    const imageHash = typeof row.imageHash === "string" ? row.imageHash : "";
    if (!strainSlug || !localPath || !imageHash) {
      skipped += 1;
      continue;
    }
    const abs = path.join(root, localPath.split("/").join(path.sep));
    if (!fs.existsSync(abs)) {
      skipped += 1;
      continue;
    }
    const key = `${strainSlug}::${imageHash}`;
    if (dedupe.has(key)) {
      skipped += 1;
      continue;
    }
    dedupe.add(key);

    const refRow = {
      strainSlug,
      strainName,
      sourceName: "user-confirmed-scan",
      sourcePageUrl: "",
      imageUrl: "",
      localPath,
      licenseNote:
        "User-confirmed scan image used as trusted reference for embedding/training. Verify usage rights before redistribution.",
      collectedAt: typeof row.confirmedAt === "string" ? row.confirmedAt : new Date().toISOString(),
      status: "downloaded",
      disabled: false,
      reviewStatus: "trusted_user_confirmed",
      width: null,
      height: null,
      contentHash: imageHash,
    };

    outLines.push(JSON.stringify(refRow));
    promoted += 1;
  }

  if (outLines.length) {
    fs.appendFileSync(referenceJsonlPath, outLines.join("\n") + "\n", "utf8");
  }

  console.log(`promoted=${promoted}`);
  console.log(`skipped=${skipped}`);
  console.log(`__PROMOTE_STATS__ ${JSON.stringify({ promoted, skipped })}`);
}

main();
