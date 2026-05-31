import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname } from "node:path";

const OUTPUT_PATH = "data/normalized-strain-catalog.json";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") args.input = argv[++index];
  }
  return args;
}

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

function recordsFromInput(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.strains)) return raw.strains;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.data)) return raw.data;
  if (raw && typeof raw === "object") return Object.values(raw).filter((item) => item && typeof item === "object");
  return [];
}

function pushSourceRef(target, sourceRef) {
  const key = `${sourceRef.sourceKind ?? "source"}::${sourceRef.sourceId ?? "unknown"}::${sourceRef.sourceUrl ?? ""}`;
  const existing = target.sourceRefs.some(
    (source) => `${source.sourceKind ?? "source"}::${source.sourceId ?? "unknown"}::${source.sourceUrl ?? ""}` === key
  );
  if (!existing) target.sourceRefs.push(sourceRef);
}

function mergeMetadata(target, metadata) {
  target.metadata = {
    ...(target.metadata ?? {}),
    ...Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => {
        if (value == null) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "string") return value.trim().length > 0;
        return true;
      })
    ),
  };
}

function mergeRecord(records, inputRecord, sourceId) {
  const slug = slugify(inputRecord.slug || inputRecord.name || inputRecord.displayName);
  if (!slug) return false;

  const displayName = inputRecord.displayName || inputRecord.name || titleize(slug);
  const existing = records.get(slug) ?? {
    slug,
    displayName,
    aliases: [],
    type: "Unknown",
    lineage: [],
    effects: [],
    flavors: [],
    sourceRefs: [],
    confidence: "low",
    reviewStatus: "candidate",
    metadata: {},
  };

  if (existing.displayName !== displayName) existing.aliases.push(displayName);
  existing.aliases.push(...normalizeArray(inputRecord.aliases));
  existing.type = existing.type === "Unknown" ? normalizeType(inputRecord.type || inputRecord.dominantType) : existing.type;
  existing.lineage.push(...normalizeArray(inputRecord.lineage || inputRecord.genetics));
  existing.effects.push(...normalizeArray(inputRecord.effects));
  existing.flavors.push(...normalizeArray(inputRecord.flavors || inputRecord.terpeneProfile || inputRecord.commonTerpenes));

  mergeMetadata(existing, {
    description: inputRecord.description,
    thc: inputRecord.thc,
    cbd: inputRecord.cbd,
    breeder: inputRecord.breeder,
    labTestResults: inputRecord.labTestResults,
    visualProfile: inputRecord.visualProfile,
    morphology: inputRecord.morphology,
    indicaSativaRatio: inputRecord.indicaSativaRatio,
  });

  pushSourceRef(existing, {
    sourceKind: "large-catalog-import",
    sourceId,
    sourceUrl: inputRecord.sourceUrl || null,
    originalSource: inputRecord.source || null,
  });

  existing.aliases = uniqueStrings(existing.aliases).filter(
    (alias) => slugify(alias) !== slug && alias.toLowerCase() !== existing.displayName.toLowerCase()
  );
  existing.lineage = uniqueStrings(existing.lineage);
  existing.effects = uniqueStrings(existing.effects);
  existing.flavors = uniqueStrings(existing.flavors);
  existing.confidence =
    existing.type !== "Unknown" ||
    existing.effects.length > 0 ||
    existing.flavors.length > 0 ||
    existing.lineage.length > 0 ||
    Object.keys(existing.metadata ?? {}).length > 0
      ? "medium"
      : "low";

  records.set(slug, existing);
  return true;
}

async function backupOutputIfPresent() {
  if (!existsSync(OUTPUT_PATH)) return null;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${OUTPUT_PATH}.${timestamp}.bak`;
  await copyFile(OUTPUT_PATH, backupPath);
  return backupPath;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    throw new Error('Usage: node scripts/import-large-strain-catalog.mjs --input "PATH_TO_JSON"');
  }

  const raw = await readJson(args.input, null);
  const inputRecords = recordsFromInput(raw);
  const records = new Map();
  const sourceId = basename(args.input).replace(/\.json$/i, "");

  let imported = 0;
  for (const record of inputRecords) {
    if (mergeRecord(records, record, sourceId)) imported += 1;
  }

  const strains = [...records.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  const backupPath = await backupOutputIfPresent();
  await writeJson(OUTPUT_PATH, {
    version: 1,
    updatedAt: new Date().toISOString(),
    importedFrom: args.input,
    strains,
  });

  console.log("Large strain catalog import");
  console.log("===========================");
  console.log(`Input: ${args.input}`);
  console.log(`Input records: ${inputRecords.length}`);
  console.log(`Imported records: ${imported}`);
  console.log(`Normalized strains: ${strains.length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  if (backupPath) console.log(`Backup: ${backupPath}`);
  console.log("lib/data/strains.json was not updated.");
}

main().catch((error) => {
  console.error("Large catalog import failed:", error);
  process.exit(1);
});
