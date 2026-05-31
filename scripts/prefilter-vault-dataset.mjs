import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, sep } from "node:path";
import { DATA_PATHS } from "./data-paths.mjs";

const VAULT_INDEX_PATH = DATA_PATHS.vaultIndexPath();
const TARGETS_PATH = DATA_PATHS.strainTargetsPath();
const REPORT_PATH = DATA_PATHS.prefilterReportPath();
const PREFILTERED_MANIFEST_PATH = DATA_PATHS.prefilteredManifestPath();

const MAX_CANDIDATES_PER_TARGET = 12;
const MIN_REVIEWABLE_BYTES = 8 * 1024;
const GLOSSY_CATALOG_TERMS = [
  "stock",
  "catalog",
  "product",
  "studio",
  "promo",
  "leafly",
  "seedfinder",
  "seedsman",
  "ilgm",
  "royal-queen",
  "royalqueen",
  "barneys",
  "fastbuds",
  "cropking",
];
const BAD_PATH_TERMS = [
  `${sep}packaging${sep}`,
  `${sep}package${sep}`,
  `${sep}labels${sep}`,
  `${sep}label${sep}`,
];

function toText(...values) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function hasAnyTerm(text, terms) {
  return terms.some((term) => text.includes(term));
}

function isLikelyGlossy(item) {
  const text = toText(item.fileName, item.filePath, item.source, item.guessedStrainSlug);
  return hasAnyTerm(text, GLOSSY_CATALOG_TERMS);
}

function isBadPath(item) {
  const normalizedPath = String(item.filePath ?? "").toLowerCase();
  return BAD_PATH_TERMS.some((term) => normalizedPath.includes(term));
}

function matchTargetSlug(item, targets) {
  const guessed = String(item.guessedStrainSlug ?? "").toLowerCase();
  if (!guessed) return null;

  const exact = targets.find((target) => target.slug === guessed);
  if (exact) return exact.slug;

  const variants = targets
    .filter(
      (target) =>
        guessed.includes(target.slug) ||
        target.slug.includes(guessed) ||
        guessed.includes(target.slug.replace(/-/g, ""))
    )
    .sort((a, b) => b.slug.length - a.slug.length);

  return variants[0]?.slug ?? null;
}

function scoreCandidate(item, targetSlug) {
  let score = 100;
  const reasons = [];
  const guessed = String(item.guessedStrainSlug ?? "");

  if (typeof item.size === "number") {
    if (item.size < MIN_REVIEWABLE_BYTES) {
      score -= 60;
      reasons.push("very-small-file");
    } else if (item.size < 20 * 1024) {
      score -= 15;
      reasons.push("small-file");
    } else if (item.size > 45 * 1024) {
      score += 8;
      reasons.push("larger-file");
    }
  }

  if (guessed === targetSlug) {
    score += 30;
    reasons.push("exact-target-slug");
  } else if (guessed.includes(targetSlug)) {
    score += 18;
    reasons.push("target-variant-slug");
  }

  const parent = basename(dirname(item.filePath ?? ""));
  if (parent === "buds") {
    score += 12;
    reasons.push("bud-folder");
  }

  return { score, reasons };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  if (!existsSync(VAULT_INDEX_PATH)) {
    throw new Error("Missing data/vault-index.json. Run npm run dataset:index-vault first.");
  }
  if (!existsSync(TARGETS_PATH)) {
    throw new Error("Missing data/strain-targets.json.");
  }

  const vaultIndex = await readJson(VAULT_INDEX_PATH);
  const targets = await readJson(TARGETS_PATH);
  const targetRows = targets.map((target) => ({ slug: String(target.slug) }));
  const items = Array.isArray(vaultIndex.items) ? vaultIndex.items : [];

  const grouped = new Map();
  const autoRejected = [];
  const notTarget = [];

  for (const item of items) {
    const glossy = isLikelyGlossy(item);
    const badPath = isBadPath(item);
    const tooSmall = typeof item.size === "number" && item.size < MIN_REVIEWABLE_BYTES;
    if (glossy || badPath || tooSmall) {
      autoRejected.push({
        fileName: item.fileName,
        filePath: item.filePath,
        guessedStrainSlug: item.guessedStrainSlug,
        targetSlug: matchTargetSlug(item, targetRows),
        reason: glossy
          ? "glossy-catalog-signal"
          : badPath
            ? "packaging-or-label-folder"
            : "very-small-file",
      });
      continue;
    }

    const targetSlug = matchTargetSlug(item, targetRows);
    if (!targetSlug) {
      notTarget.push({
        fileName: item.fileName,
        filePath: item.filePath,
        guessedStrainSlug: item.guessedStrainSlug,
        reason: "not-a-target-strain",
      });
      continue;
    }

    const scored = scoreCandidate(item, targetSlug);
    const row = {
      ...item,
      targetSlug,
      prefilterScore: scored.score,
      prefilterReasons: scored.reasons,
    };
    const rows = grouped.get(targetSlug) ?? [];
    rows.push(row);
    grouped.set(targetSlug, rows);
  }

  const kept = [];
  const byTarget = [];

  for (const target of targetRows) {
    const rows = (grouped.get(target.slug) ?? []).sort(
      (a, b) =>
        b.prefilterScore - a.prefilterScore ||
        Number(b.size ?? 0) - Number(a.size ?? 0) ||
        String(a.filePath).localeCompare(String(b.filePath))
    );
    const selected = rows.slice(0, MAX_CANDIDATES_PER_TARGET);
    kept.push(...selected);
    byTarget.push({
      slug: target.slug,
      matchedCandidates: rows.length,
      keptForReview: selected.length,
      autoRejected: autoRejected.filter((item) => item.targetSlug === target.slug).length,
    });
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "vault-prefilter",
    items: kept.map((item) => ({
      fileName: item.fileName,
      filePath: item.filePath,
      extension: item.extension,
      size: item.size,
      modifiedAt: item.modifiedAt,
      strainSlug: item.targetSlug,
      guessedStrainSlug: item.guessedStrainSlug,
      source: "vault",
      labelConfidence:
        item.guessedStrainSlug === item.targetSlug ? "high" : "medium",
      approvedForTraining: false,
      approvedForEval: false,
      rejectReason: null,
      notes: `Prefilter score ${item.prefilterScore}. Reasons: ${item.prefilterReasons.join(", ") || "none"}.`,
      prefilterScore: item.prefilterScore,
      prefilterReasons: item.prefilterReasons,
    })),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    vaultRoot: vaultIndex.root ?? null,
    indexedImagesProcessed: items.length,
    targetStrains: targetRows.length,
    maxCandidatesPerTarget: MAX_CANDIDATES_PER_TARGET,
    candidatesKeptForReview: kept.length,
    glossyBadAutoRejected: autoRejected.length,
    nonTargetImagesSkipped: notTarget.length,
    byTarget,
    autoRejected,
  };

  await mkdir(dirname(PREFILTERED_MANIFEST_PATH), { recursive: true });
  await writeFile(PREFILTERED_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

  console.log("Vault dataset prefilter");
  console.log("=======================");
  console.log(`Indexed images processed: ${report.indexedImagesProcessed}`);
  console.log(`Candidates kept for review: ${report.candidatesKeptForReview}`);
  console.log(`Glossy/bad auto-rejected: ${report.glossyBadAutoRejected}`);
  console.log(`Non-target images skipped: ${report.nonTargetImagesSkipped}`);
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(`Wrote ${PREFILTERED_MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error("Vault prefilter failed:", error);
  process.exit(1);
});
