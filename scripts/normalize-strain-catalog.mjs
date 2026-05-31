import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

const METADATA_CANDIDATES_PATH = "data/scrape/metadata-candidates.json";
const EXISTING_STRAINS_PATH = "lib/data/strains.json";
const STRAIN_TARGETS_PATH = "data/strain-targets.json";
const OUTPUT_PATH = "data/normalized-strain-catalog.json";

const VALID_TYPES = new Set(["Indica", "Sativa", "Hybrid", "Unknown"]);

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleize(slug) {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function normalizeType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.includes("indica")) return "Indica";
  if (raw.includes("sativa")) return "Sativa";
  if (raw.includes("hybrid")) return "Hybrid";
  return "Unknown";
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/[,|•/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.flat().map((item) => String(item ?? "").trim()).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function makeEmptyRecord(slug, displayName) {
  return {
    slug,
    displayName: displayName || titleize(slug),
    aliases: [],
    typeVotes: [],
    lineage: [],
    effects: [],
    flavors: [],
    sourceRefs: [],
    hasExistingCatalogMatch: false,
    hasTargetMatch: false,
    importedMetadata: {},
    reviewStatus: "candidate",
  };
}

function getRecord(records, slug, displayName) {
  if (!records.has(slug)) records.set(slug, makeEmptyRecord(slug, displayName));
  const record = records.get(slug);
  if (displayName && record.displayName === titleize(slug)) record.displayName = displayName;
  return record;
}

function pushSourceRef(record, sourceRef) {
  const key = `${sourceRef.sourceId ?? "unknown"}::${sourceRef.sourceUrl ?? sourceRef.name ?? record.slug}`;
  if (record.sourceRefs.some((existing) => `${existing.sourceId ?? "unknown"}::${existing.sourceUrl ?? existing.name ?? record.slug}` === key)) {
    return;
  }
  record.sourceRefs.push(sourceRef);
}

function mergeMetadata(record, metadata) {
  record.importedMetadata = {
    ...(record.importedMetadata ?? {}),
    ...Object.fromEntries(
      Object.entries(metadata ?? {}).filter(([, value]) => {
        if (value == null) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "string") return value.trim().length > 0;
        return true;
      })
    ),
  };
}

function chooseType(typeVotes) {
  const votes = typeVotes.filter((type) => VALID_TYPES.has(type) && type !== "Unknown");
  if (!votes.length) return "Unknown";
  const counts = new Map();
  for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function assignConfidence(record, type) {
  const candidateSourceIds = new Set(
    record.sourceRefs
      .filter((source) => source.sourceKind === "metadata-candidate")
      .map((source) => source.sourceId || source.sourceUrl)
      .filter(Boolean)
  );
  const hasMultipleCandidateSources = candidateSourceIds.size >= 2;
  const hasLargeCatalogImport = record.sourceRefs.some(
    (source) => source.sourceKind === "large-catalog-import"
  );
  const hasUsefulDetails =
    record.effects.length > 0 ||
    record.flavors.length > 0 ||
    record.lineage.length > 0 ||
    Object.keys(record.importedMetadata ?? {}).length > 0 ||
    type !== "Unknown";

  if (hasMultipleCandidateSources && hasUsefulDetails) return "high";
  if (hasLargeCatalogImport && hasUsefulDetails) return "medium";
  if ((record.hasExistingCatalogMatch || record.hasTargetMatch) && hasUsefulDetails) return "medium";
  if (candidateSourceIds.size === 1 && hasUsefulDetails) return "medium";
  return "low";
}

function addMetadataCandidate(records, candidate) {
  const slug = slugify(candidate.slug || candidate.name);
  if (!slug) return;
  const record = getRecord(records, slug, candidate.name);
  record.aliases.push(...normalizeArray(candidate.aliases));
  record.typeVotes.push(normalizeType(candidate.type));
  record.lineage.push(...normalizeArray(candidate.lineage));
  record.effects.push(...normalizeArray(candidate.effects));
  record.flavors.push(...normalizeArray(candidate.flavors));
  mergeMetadata(record, {
    description: candidate.description,
    thc: candidate.thc,
    cbd: candidate.cbd,
  });
  pushSourceRef(record, {
    sourceKind: "metadata-candidate",
    sourceId: candidate.sourceId || "unknown",
    sourceUrl: candidate.sourceUrl || null,
    licenseNotes: candidate.licenseNotes || null,
    scrapedAt: candidate.scrapedAt || null,
  });
}

function addNormalizedCatalogRecord(records, strain) {
  const slug = slugify(strain.slug || strain.displayName);
  if (!slug) return;
  const record = getRecord(records, slug, strain.displayName);
  record.aliases.push(...normalizeArray(strain.aliases));
  record.typeVotes.push(normalizeType(strain.type));
  record.lineage.push(...normalizeArray(strain.lineage));
  record.effects.push(...normalizeArray(strain.effects));
  record.flavors.push(...normalizeArray(strain.flavors));
  record.reviewStatus = ["candidate", "approved", "rejected"].includes(strain.reviewStatus)
    ? strain.reviewStatus
    : "candidate";
  mergeMetadata(record, strain.metadata ?? {});
  for (const sourceRef of Array.isArray(strain.sourceRefs) ? strain.sourceRefs : []) {
    pushSourceRef(record, sourceRef);
  }
}

function addExistingStrain(records, strain) {
  const slug = slugify(strain.slug || strain.name);
  if (!slug) return;
  const record = getRecord(records, slug, strain.displayName || strain.name);
  record.hasExistingCatalogMatch = true;
  record.aliases.push(...normalizeArray(strain.aliases));
  record.typeVotes.push(normalizeType(strain.type || strain.dominantType));
  record.lineage.push(...normalizeArray(strain.lineage || strain.genetics));
  record.effects.push(...normalizeArray(strain.effects));
  record.flavors.push(...normalizeArray(strain.flavors || strain.terpeneProfile || strain.commonTerpenes));
  pushSourceRef(record, {
    sourceKind: "existing-catalog",
    sourceId: "lib-data-strains",
    sourceUrl: null,
  });
}

function addTarget(records, target) {
  const slug = slugify(target.slug);
  if (!slug) return;
  const record = getRecord(records, slug, target.displayName);
  record.hasTargetMatch = true;
  pushSourceRef(record, {
    sourceKind: "priority-target",
    sourceId: "strain-targets",
    sourceUrl: null,
  });
}

async function main() {
  const [currentNormalizedCatalog, metadataCandidates, existingStrains, strainTargets] = await Promise.all([
    readJson(OUTPUT_PATH, { strains: [] }),
    readJson(METADATA_CANDIDATES_PATH, []),
    readJson(EXISTING_STRAINS_PATH, []),
    readJson(STRAIN_TARGETS_PATH, []),
  ]);

  const records = new Map();
  for (const strain of Array.isArray(currentNormalizedCatalog?.strains) ? currentNormalizedCatalog.strains : []) {
    addNormalizedCatalogRecord(records, strain);
  }
  for (const strain of Array.isArray(existingStrains) ? existingStrains : []) addExistingStrain(records, strain);
  for (const target of Array.isArray(strainTargets) ? strainTargets : []) addTarget(records, target);
  for (const candidate of Array.isArray(metadataCandidates) ? metadataCandidates : []) addMetadataCandidate(records, candidate);

  const strains = [...records.values()]
    .map((record) => {
      const type = chooseType(record.typeVotes);
      const aliases = uniqueStrings(record.aliases).filter(
        (alias) => slugify(alias) !== record.slug && alias.toLowerCase() !== record.displayName.toLowerCase()
      );
      const normalized = {
        slug: record.slug,
        displayName: record.displayName,
        aliases,
        type,
        lineage: uniqueStrings(record.lineage),
        effects: uniqueStrings(record.effects),
        flavors: uniqueStrings(record.flavors),
        sourceRefs: record.sourceRefs.sort((a, b) =>
          String(a.sourceKind ?? "").localeCompare(String(b.sourceKind ?? ""))
        ),
        ...(Object.keys(record.importedMetadata ?? {}).length > 0
          ? { metadata: record.importedMetadata }
          : {}),
        confidence: "low",
        reviewStatus: record.reviewStatus,
      };
      normalized.confidence = assignConfidence({ ...record, ...normalized }, type);
      return normalized;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const catalog = {
    version: 1,
    updatedAt: new Date().toISOString(),
    strains,
  };

  await writeJson(OUTPUT_PATH, catalog);

  const approvedCount = strains.filter((strain) => strain.reviewStatus === "approved").length;
  const candidateCount = strains.filter((strain) => strain.reviewStatus === "candidate").length;
  console.log("Normalized strain catalog");
  console.log("=========================");
  console.log(`Strains: ${strains.length}`);
  console.log(`Candidates: ${candidateCount}`);
  console.log(`Approved: ${approvedCount}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Catalog normalization failed:", error);
  process.exit(1);
});
