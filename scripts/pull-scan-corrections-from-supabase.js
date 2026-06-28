#!/usr/bin/env node

/**
 * Close the training flywheel: pull durable, production-captured corrections out
 * of Supabase and materialize them as LOCAL training records the existing
 * pipeline already understands.
 *
 * On serverless (Vercel) the local data/scan-feedback-local.jsonl and
 * data/scanner-training/confirmed-scans.jsonl are ephemeral, so real user
 * feedback only survives in:
 *   - table  scan_corrections        (written by app/api/scan/feedback/route.ts)
 *   - bucket training-images         (consent-gated photo, foldered by strain)
 *
 * Nothing read those back, so the loop was open: data in, never consumed. This
 * script bridges Supabase -> local confirmed-scans.jsonl + local training images
 * so the downstream steps run on real production feedback:
 *
 *   scanner:training:pull  ->  scanner:training:promote  ->  scanner:recalibrate
 *
 * Idempotent: dedupes against existing confirmed-scans.jsonl (by scanId and by
 * strainSlug::imageHash) and keeps a created_at cursor so cron re-runs only fetch
 * new corrections.
 *
 * Usage:
 *   node scripts/pull-scan-corrections-from-supabase.js [--since ISO] [--limit N]
 *                                                       [--dry-run] [--no-cursor]
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { getSupabaseAdminClient } = require("../lib/server/supabaseStorage.js");
const storagePaths = require("../lib/server/storagePaths.js");

const root = path.resolve(__dirname, "..");
const trainingRoot = path.join(root, "data", "scanner-training");
const confirmedPath = path.join(trainingRoot, "confirmed-scans.jsonl");
const cursorPath = path.join(trainingRoot, ".scan-corrections-cursor.json");

// Bucket the feedback API writes to (literal in route.ts, overridable for tests).
const FEEDBACK_IMAGE_BUCKET =
  process.env.SUPABASE_FEEDBACK_IMAGE_BUCKET || "training-images";

const TABLE = "scan_corrections";
const IMAGE_EXTS = ["jpg", "png", "webp"];

function loadOptionalEnvFiles() {
  const candidates = [
    path.join(root, ".env.local"),
    path.join(root, "env", ".env.local"),
    path.join(root, ".env"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const out = { limit: 1000, dryRun: false, since: null, useCursor: true };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--dry-run") out.dryRun = true;
    else if (item === "--no-cursor") out.useCursor = false;
    else if (item === "--since") out.since = argv[++i] || null;
    else if (item === "--limit") out.limit = Number(argv[++i]) || out.limit;
  }
  return out;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function readCursor() {
  if (!fs.existsSync(cursorPath)) return null;
  try {
    const c = JSON.parse(fs.readFileSync(cursorPath, "utf8"));
    return typeof c.lastCreatedAt === "string" ? c.lastCreatedAt : null;
  } catch {
    return null;
  }
}

function writeCursor(lastCreatedAt) {
  fs.mkdirSync(trainingRoot, { recursive: true });
  fs.writeFileSync(
    cursorPath,
    JSON.stringify({ lastCreatedAt, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

/** Mirror lib/scanner/saveConfirmedTraining.ts slimTopMatches. */
function slimTopMatches(matches) {
  if (!Array.isArray(matches)) return [];
  return matches.slice(0, 8).map((m) => {
    if (!m || typeof m !== "object") return m;
    return { slug: m.slug, name: m.name, rank: m.rank, confidence: m.confidence };
  });
}

/** Store path relative to repo root when possible so promote's path.join(root, …) resolves. */
function toLocalRel(absPath) {
  const rel = path.relative(root, absPath);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel.split(path.sep).join("/");
  }
  // Training root lives outside the repo (e.g. TheVault); keep absolute —
  // resolveReferenceLocalPath() handles it, though promote requires in-repo paths.
  return absPath;
}

/** Download the consent-gated photo for a correction, if one was stored. */
async function downloadTrainingImage(admin, slug, scanId) {
  if (!scanId) return null; // route keys images by scanId; no scanId => unrecoverable
  for (const ext of IMAGE_EXTS) {
    const key = `${slug}/${scanId}.${ext}`;
    const { data, error } = await admin.storage
      .from(FEEDBACK_IMAGE_BUCKET)
      .download(key);
    if (error || !data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.length > 0) return { buf, ext };
  }
  return null;
}

async function main() {
  loadOptionalEnvFiles();
  const args = parseArgs(process.argv.slice(2));

  const admin = getSupabaseAdminClient();

  const since = args.since || (args.useCursor ? readCursor() : null);

  let query = admin
    .from(TABLE)
    .select("*")
    .not("correct_strain_slug", "is", null)
    .order("created_at", { ascending: true })
    .limit(args.limit);
  if (since) query = query.gt("created_at", since);

  const { data: rows, error } = await query;
  if (error) {
    console.error("Failed to query scan_corrections:", error.message || error);
    process.exit(1);
  }

  const corrections = Array.isArray(rows) ? rows : [];

  // Dedupe against what we already have locally.
  const existing = readConfirmed();
  const seenScanIds = new Set();
  const seenSlugHash = new Set();
  for (const r of existing) {
    if (r.scanId) seenScanIds.add(String(r.scanId));
    if (r.correctStrainSlug && r.imageHash) {
      seenSlugHash.add(`${r.correctStrainSlug}::${r.imageHash}`);
    }
  }

  const stats = {
    fetched: corrections.length,
    appended: 0,
    withImage: 0,
    skippedDuplicate: 0,
    skippedNoSlug: 0,
  };

  const outLines = [];
  let maxCreatedAt = since || null;

  for (const row of corrections) {
    const createdAt = typeof row.created_at === "string" ? row.created_at : null;
    if (createdAt && (!maxCreatedAt || createdAt > maxCreatedAt)) maxCreatedAt = createdAt;

    const strainSlug =
      (typeof row.correct_strain_slug === "string" && row.correct_strain_slug.trim()) ||
      slugify(row.correct_strain_name || "");
    if (!strainSlug) {
      stats.skippedNoSlug += 1;
      continue;
    }
    const strainName =
      typeof row.correct_strain_name === "string" && row.correct_strain_name.trim()
        ? row.correct_strain_name.trim()
        : strainSlug;
    const scanId = typeof row.scan_id === "string" ? row.scan_id : null;

    if (scanId && seenScanIds.has(scanId)) {
      stats.skippedDuplicate += 1;
      continue;
    }

    // Pull the photo (consent-gated; absent for image-less corrections).
    let imageLocalPath = "";
    let imageHash = "";
    if (!args.dryRun) {
      try {
        const img = await downloadTrainingImage(admin, strainSlug, scanId);
        if (img) {
          imageHash = crypto.createHash("sha256").update(img.buf).digest("hex");
          const slugHashKey = `${strainSlug}::${imageHash}`;
          if (seenSlugHash.has(slugHashKey)) {
            stats.skippedDuplicate += 1;
            continue;
          }
          const abs = path.join(
            storagePaths.getTrainingImageStorageRoot(),
            strainSlug,
            `${imageHash}.${img.ext}`
          );
          fs.mkdirSync(path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, img.buf);
          imageLocalPath = toLocalRel(abs);
          seenSlugHash.add(slugHashKey);
          stats.withImage += 1;
        }
      } catch (e) {
        console.warn(`image pull failed for ${strainSlug}/${scanId}:`, e.message || e);
      }
    }

    const record = {
      scanId: scanId || "",
      createdAt: createdAt || new Date().toISOString(),
      confirmedAt: createdAt || new Date().toISOString(),
      correctStrainSlug: strainSlug,
      correctStrainName: strainName,
      previousTopMatches: slimTopMatches(row.predicted_top_matches),
      previousRank: typeof row.previous_rank === "number" ? row.previous_rank : null,
      previousConfidence:
        typeof row.previous_confidence === "number" ? row.previous_confidence : null,
      imageLocalPath,
      imageHash,
      visualTraits:
        row.visual_traits && typeof row.visual_traits === "object" ? row.visual_traits : {},
      embeddingNearestNeighbors: [],
      provider: typeof row.provider === "string" ? row.provider : "",
      model: typeof row.model === "string" ? row.model : "",
      source: "user_feedback",
      wrongTopMatchSlug:
        typeof row.wrong_top_match_slug === "string" ? row.wrong_top_match_slug : null,
      pulledFrom: "supabase:scan_corrections",
    };

    if (scanId) seenScanIds.add(scanId);
    outLines.push(JSON.stringify(record));
    stats.appended += 1;
  }

  if (outLines.length && !args.dryRun) {
    fs.mkdirSync(trainingRoot, { recursive: true });
    fs.appendFileSync(confirmedPath, outLines.join("\n") + "\n", "utf8");
  }

  if (!args.dryRun && args.useCursor && maxCreatedAt) {
    writeCursor(maxCreatedAt);
  }

  console.log(
    `pulled ${stats.fetched} corrections — appended=${stats.appended} ` +
      `withImage=${stats.withImage} dupSkipped=${stats.skippedDuplicate} ` +
      `noSlug=${stats.skippedNoSlug}${args.dryRun ? " (dry-run)" : ""}`
  );
  console.log(`__PULL_STATS__ ${JSON.stringify(stats)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
