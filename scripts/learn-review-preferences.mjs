import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname } from "node:path";
import { DATA_PATHS, PROJECT_DATA_ROOT } from "./data-paths.mjs";

const KEYWORD_SIGNALS = [
  "bud",
  "buds",
  "flower",
  "flowers",
  "nug",
  "nugs",
  "cola",
  "plant",
  "grower",
  "homegrown",
  "natural",
  "natural-light",
  "indoor",
  "outdoor",
  "garden",
  "packaging",
  "package",
  "label",
  "product",
  "studio",
  "glossy",
  "catalog",
  "stock",
  "seed",
  "seeds",
  "seedbank",
  "logo",
  "icon",
  "banner",
  "thumbnail",
  "thumb",
  "cart",
  "vape",
  "preroll",
  "fastbuds",
  "blimburnseeds",
  "royalqueenseeds",
  "seedsman",
  "ilgm",
];
const NEVER_APPROVE_KEYWORDS = new Set([
  "packaging",
  "package",
  "label",
  "product",
  "studio",
  "glossy",
  "catalog",
  "stock",
  "seed",
  "seeds",
  "seedbank",
  "logo",
  "icon",
  "banner",
  "thumbnail",
  "thumb",
  "cart",
  "vape",
  "preroll",
  "fastbuds",
  "blimburnseeds",
  "royalqueenseeds",
  "seedsman",
  "ilgm",
]);

const PLAIN_LANGUAGE = {
  packaging: "packaging photos",
  package: "packaging photos",
  label: "label photos",
  product: "product photos",
  studio: "studio photos",
  glossy: "glossy photos",
  catalog: "catalog photos",
  stock: "stock photos",
  seed: "seed photos",
  seeds: "seed photos",
  seedbank: "seedbank photos",
  logo: "logo photos",
  icon: "icon photos",
  banner: "banner photos",
  thumbnail: "tiny thumbnail photos",
  thumb: "tiny thumbnail photos",
  cart: "cart photos",
  vape: "vape photos",
  preroll: "preroll photos",
  bud: "natural bud photos",
  buds: "natural bud photos",
  flower: "flower photos",
  flowers: "flower photos",
  nug: "nug photos",
  nugs: "nug photos",
  grower: "grower-looking photos",
  homegrown: "homegrown photos",
  natural: "natural-light photos",
  "natural-light": "natural-light photos",
  plant: "plant photos",
};

function emptyProfile() {
  return {
    version: 1,
    updatedAt: null,
    approvedSignals: {},
    rejectedSignals: {},
    sourceScores: {},
    strainStats: {},
    summaries: {
      approvedPatterns: [],
      rejectedPatterns: [],
      trustedSources: [],
      rejectedReasons: [],
    },
  };
}

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function normalizeText(...values) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function addSignal(bucket, key, amount = 1) {
  if (!key) return;
  bucket[key] ??= { count: 0, weight: 0 };
  bucket[key].count += 1;
  bucket[key].weight += amount;
}

function addSourceScore(profile, sourceId, approved, rejected) {
  if (!sourceId) return;
  profile.sourceScores[sourceId] ??= { approved: 0, rejected: 0, weight: 0 };
  profile.sourceScores[sourceId].approved += approved;
  profile.sourceScores[sourceId].rejected += rejected;
  profile.sourceScores[sourceId].weight =
    profile.sourceScores[sourceId].approved - profile.sourceScores[sourceId].rejected;
}

function addStrainStats(profile, strainSlug, approved, rejected) {
  if (!strainSlug) return;
  profile.strainStats[strainSlug] ??= { approved: 0, rejected: 0, total: 0 };
  profile.strainStats[strainSlug].approved += approved;
  profile.strainStats[strainSlug].rejected += rejected;
  profile.strainStats[strainSlug].total += approved + rejected;
}

function matchingKeywords(candidate, decision) {
  const text = normalizeText(
    candidate?.fileName,
    candidate?.imageUrl,
    candidate?.sourceUrl,
    candidate?.queryUsed,
    decision?.notes,
    decision?.rejectReason
  );
  return KEYWORD_SIGNALS.filter((keyword) => text.includes(keyword));
}

function candidateWarnings(candidate) {
  const warnings = [
    ...(Array.isArray(candidate?.qualityWarnings) ? candidate.qualityWarnings : []),
    ...(Array.isArray(candidate?.quality?.qualityWarnings) ? candidate.quality.qualityWarnings : []),
    ...(Array.isArray(candidate?.quality?.warnings) ? candidate.quality.warnings : []),
  ];
  return Array.from(new Set(warnings.map((warning) => String(warning).trim()).filter(Boolean)));
}

function isApprovedDecision(item) {
  return item?.approvedForTraining === true || item?.approvedForEval === true;
}

function isRejectedDecision(item) {
  return Boolean(item?.rejectReason);
}

function signalLabel(signalKey) {
  const keyword = signalKey.replace(/^keyword:/, "");
  return PLAIN_LANGUAGE[keyword] ?? keyword.replaceAll("-", " ");
}

function topEntries(object, limit = 6) {
  return Object.entries(object)
    .sort(([, a], [, b]) => Number(b.weight ?? b.count ?? 0) - Number(a.weight ?? a.count ?? 0))
    .slice(0, limit)
    .map(([key, value]) => ({ key, ...value }));
}

function differentialSignalRows(profile, prefix, direction, limit = 6) {
  const keys = new Set([
    ...Object.keys(profile.approvedSignals ?? {}),
    ...Object.keys(profile.rejectedSignals ?? {}),
  ]);
  return [...keys]
    .filter((key) => key.startsWith(prefix))
    .map((key) => {
      const approved = Number(profile.approvedSignals?.[key]?.weight ?? 0);
      const rejected = Number(profile.rejectedSignals?.[key]?.weight ?? 0);
      return {
        key,
        approved,
        rejected,
        margin: direction === "approved" ? approved - rejected : rejected - approved,
      };
    })
    .filter((row) => row.margin > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, limit);
}

function buildSummaries(profile) {
  const approvedPatterns = differentialSignalRows(profile, "keyword:", "approved")
    .filter((row) => !NEVER_APPROVE_KEYWORDS.has(row.key.replace(/^keyword:/, "")))
    .map((row) => `You usually approve ${signalLabel(row.key)}.`);
  const rejectedPatterns = differentialSignalRows(profile, "keyword:", "rejected")
    .map((row) => `You usually reject ${signalLabel(row.key)}.`);
  const trustedSources = Object.entries(profile.sourceScores)
    .filter(([, row]) => Number(row.weight) > 0)
    .sort(([, a], [, b]) => Number(b.weight) - Number(a.weight))
    .slice(0, 5)
    .map(([sourceId]) => `You tend to approve photos from ${sourceId}.`);
  const rejectedReasons = topEntries(profile.rejectedSignals)
    .filter((row) => row.key.startsWith("rejectReason:"))
    .map((row) => `You often reject: ${row.key.replace(/^rejectReason:/, "")}.`);
  return {
    approvedPatterns,
    rejectedPatterns,
    trustedSources,
    rejectedReasons,
  };
}

async function main() {
  const candidatesPath = DATA_PATHS.imageCandidatesPath();
  const reviewManifestPath = DATA_PATHS.reviewManifestPath();
  const preferencesPath = DATA_PATHS.reviewPreferencesPath();
  const projectPreferencesPath = `${PROJECT_DATA_ROOT}/scrape/review-preferences.json`;
  const candidates = await readJson(candidatesPath, []);
  const manifest = await readJson(reviewManifestPath, { items: [] });
  const profile = emptyProfile();
  const candidateByFileName = new Map(
    (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => candidate?.fileName)
      .map((candidate) => [basename(String(candidate.fileName)), candidate])
  );

  const decisions = Array.isArray(manifest.items) ? manifest.items : [];
  for (const decision of decisions) {
    const fileName = basename(String(decision?.fileName ?? ""));
    const candidate = candidateByFileName.get(fileName) ?? decision;
    const approved = isApprovedDecision(decision) ? 1 : 0;
    const rejected = isRejectedDecision(decision) ? 1 : 0;
    if (!approved && !rejected) continue;

    const sourceId = candidate?.sourceId ?? decision?.sourceId ?? candidate?.source ?? decision?.source;
    const strainSlug = candidate?.strainSlug ?? decision?.strainSlug;
    addSourceScore(profile, sourceId, approved, rejected);
    addStrainStats(profile, strainSlug, approved, rejected);

    const targetBucket = approved ? profile.approvedSignals : profile.rejectedSignals;
    const signalWeight = approved ? 2 : 3;
    addSignal(targetBucket, `source:${sourceId}`, signalWeight);
    addSignal(targetBucket, `strain:${strainSlug}`, signalWeight);
    const extension = extname(fileName).toLowerCase();
    if (extension) addSignal(targetBucket, `extension:${extension}`, 1);
    if (candidate?.queryUsed) addSignal(targetBucket, `query:${candidate.queryUsed}`, 1);

    for (const keyword of matchingKeywords(candidate, decision)) {
      addSignal(targetBucket, `keyword:${keyword}`, signalWeight);
    }
    for (const warning of candidateWarnings(candidate)) {
      addSignal(targetBucket, `qualityWarning:${warning}`, rejected ? 2 : 1);
    }
    if (decision?.rejectReason) {
      addSignal(profile.rejectedSignals, `rejectReason:${decision.rejectReason}`, 3);
    }
  }

  profile.updatedAt = new Date().toISOString();
  profile.summaries = buildSummaries(profile);
  await writeJson(preferencesPath, profile);
  if (projectPreferencesPath !== preferencesPath) {
    await writeJson(projectPreferencesPath, profile);
  }

  console.log("Review preferences learned");
  console.log(`Decisions read: ${decisions.length}`);
  console.log(`Approved signals: ${Object.keys(profile.approvedSignals).length}`);
  console.log(`Rejected signals: ${Object.keys(profile.rejectedSignals).length}`);
  console.log(`Preference file: ${preferencesPath}`);
  console.log(`Approved patterns: ${profile.summaries.approvedPatterns.join(" | ") || "none yet"}`);
  console.log(`Rejected patterns: ${profile.summaries.rejectedPatterns.join(" | ") || "none yet"}`);
}

main().catch((error) => {
  console.error("Failed to learn review preferences:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
