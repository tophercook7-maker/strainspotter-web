#!/usr/bin/env node

/**
 * Full safe recalibration: promote confirmed scans → quality gate → index → embeddings → audit.
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { referenceJsonlPath, indexPath, readJsonl } = require("./reference-utils");

const root = path.resolve(__dirname, "..");

function run(cmd, optional = false) {
  console.log(`\n> ${cmd}`);
  const r = spawnSync(cmd, {
    shell: true,
    cwd: root,
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status !== 0) {
    const msg = optional
      ? `(skipped optional step — exit ${r.status})`
      : `(warning — exit ${r.status})`;
    console.warn(cmd, msg);
    if (!optional) console.warn(out.slice(-2000));
  } else if (out.trim()) {
    console.log(out.trimEnd());
  }
  return out;
}

function parsePromote(stdout) {
  const m = stdout.match(/__PROMOTE_STATS__\s+(\{[^}]+\})/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {
      /* ignore */
    }
  }
  const promoted = Number((stdout.match(/promoted=(\d+)/) || [])[1]);
  return { promoted: Number.isFinite(promoted) ? promoted : 0 };
}

function parseQuality(stdout) {
  const newly =
    Number((stdout.match(/newlyDisabled=(\d+)/) || [])[1]) || 0;
  const enabled =
    Number((stdout.match(/enabled=(\d+)/) || [])[1]) || 0;
  const disabled =
    Number((stdout.match(/disabled=(\d+)/) || [])[1]) || 0;
  return { newlyDisabled: newly, enabledFromLog: enabled, disabledFromLog: disabled };
}

function countReferenceStats() {
  const rows = readJsonl(referenceJsonlPath);
  const enabled = rows.filter((r) => r.disabled !== true);
  const perSlug = new Map();
  for (const r of enabled) {
    if (!r.localPath) continue;
    const abs = path.join(root, r.localPath.split("/").join(path.sep));
    if (!fs.existsSync(abs)) continue;
    const slug = r.strainSlug || "unknown";
    perSlug.set(slug, (perSlug.get(slug) || 0) + 1);
  }
  let below5 = 0;
  let tenPlus = 0;
  for (const n of perSlug.values()) {
    if (n < 5) below5 += 1;
    if (n >= 10) tenPlus += 1;
  }
  return {
    totalEnabledReferences: enabled.filter((r) => {
      if (!r.localPath) return false;
      return fs.existsSync(path.join(root, r.localPath.split("/").join(path.sep)));
    }).length,
    strainsBelow5Refs: below5,
    strainsTenPlusRefs: tenPlus,
    strainCount: perSlug.size,
  };
}

function embeddingStats() {
  const embPath = path.join(
    root,
    "data",
    "strain-reference-images",
    "reference-embedding-index.json"
  );
  if (!fs.existsSync(embPath)) {
    return { embeddingIndexExists: false, embeddingImageCount: 0 };
  }
  try {
    const j = JSON.parse(fs.readFileSync(embPath, "utf8"));
    return {
      embeddingIndexExists: true,
      embeddingImageCount: Number(j.imageCount || j.records?.length || 0),
    };
  } catch {
    return { embeddingIndexExists: true, embeddingImageCount: 0 };
  }
}

function npmScript(name, optional) {
  const pkgPath = path.join(root, "package.json");
  let has = false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    has = Boolean(pkg.scripts && pkg.scripts[name]);
  } catch {
    /* ignore */
  }
  if (!has) {
    console.warn(`Optional npm script missing: ${name} — skipping.`);
    return "";
  }
  return run(`npm run ${name}`, optional);
}

function main() {
  console.log("Scanner recalibration pipeline\n");

  const promoteOut = npmScript("scanner:training:promote", false);
  const promotedStats = parsePromote(promoteOut);

  const qualityOut = npmScript("references:quality", true);
  const q = parseQuality(qualityOut);

  npmScript("references:index", true);
  npmScript("references:embeddings", true);
  npmScript("references:audit", true);

  const refStats = countReferenceStats();
  const emb = embeddingStats();

  const flagPath = path.join(root, "data", "scanner-training", "recalibration-needed.json");
  try {
    fs.mkdirSync(path.dirname(flagPath), { recursive: true });
    fs.writeFileSync(
      flagPath,
      JSON.stringify(
        {
          needed: false,
          reason: "recalibrate-complete",
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    /* ignore */
  }

  console.log("\n========== RECALIBRATION SUMMARY ==========");
  console.log(`Confirmed scans promoted (this run): ${promotedStats.promoted ?? 0}`);
  console.log(`References newly disabled by quality gate (reported): ${q.newlyDisabled}`);
  console.log(`Total enabled references (usable local files): ${refStats.totalEnabledReferences}`);
  console.log(`Embedding index exists: ${emb.embeddingIndexExists}`);
  console.log(`Embedding image count: ${emb.embeddingImageCount}`);
  console.log(`Strains with fewer than 5 references: ${refStats.strainsBelow5Refs}`);
  console.log(`Strains with 10+ references: ${refStats.strainsTenPlusRefs}`);
  console.log("===========================================\n");
}

main();
