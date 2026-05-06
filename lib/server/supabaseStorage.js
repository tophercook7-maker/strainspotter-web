/**
 * Supabase Storage helpers for scanner assets (server-side / Node scripts only).
 * Uses service role — never import from client components.
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  );
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

/** @returns {import('@supabase/supabase-js').SupabaseClient} */
function getSupabaseAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!supabaseUrl || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) for admin Storage operations."
    );
  }
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function referenceBucketId() {
  return process.env.SUPABASE_REFERENCE_BUCKET || "scanner-reference-images";
}

function trainingBucketId() {
  return process.env.SUPABASE_TRAINING_BUCKET || "scanner-training-images";
}

function rawBucketId() {
  return process.env.SUPABASE_REFERENCE_RAW_BUCKET || "scanner-reference-raw-images";
}

function contentTypeForExt(ext) {
  const e = String(ext || "")
    .replace(/^\./, "")
    .toLowerCase();
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Ensure default scanner buckets exist (idempotent).
 * @param {import('@supabase/supabase-js').SupabaseClient} [admin]
 */
async function ensureScannerBuckets(admin) {
  const client = admin || getSupabaseAdminClient();
  const refId = referenceBucketId();
  const trainId = trainingBucketId();
  const rawId = rawBucketId();
  const { data: buckets, error: listErr } = await client.storage.listBuckets();
  if (listErr) throw listErr;
  const have = new Set((buckets || []).map((b) => b.name || b.id));

  if (!have.has(refId)) {
    const { error } = await client.storage.createBucket(refId, {
      public: true,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (error && !String(error.message || "").includes("already exists")) throw error;
  }
  if (!have.has(trainId)) {
    const { error } = await client.storage.createBucket(trainId, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (error && !String(error.message || "").includes("already exists")) throw error;
  }
  if (!have.has(rawId)) {
    const { error } = await client.storage.createBucket(rawId, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (error && !String(error.message || "").includes("already exists")) throw error;
  }
}

function sanitizeSlug(segment) {
  const s = String(segment || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return s || "unknown";
}

/**
 * Canonical Storage path for a training object (matches uploadTrainingImageToSupabase).
 * @param {string} strainSlug
 * @param {string} contentHash
 * @param {string} ext
 */
function trainingImageStoragePath(strainSlug, contentHash, ext) {
  const slugSeg = sanitizeSlug(strainSlug);
  const hash = String(contentHash || "").trim();
  const e = String(ext || "jpg")
    .replace(/^\./, "")
    .toLowerCase();
  return `training/${slugSeg}/${hash}.${e}`;
}

/**
 * Whether an object appears to exist under bucket at objectPath (list-based).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bucket
 * @param {string} objectPath
 */
async function storageObjectExists(admin, bucket, objectPath) {
  const normalized = String(objectPath || "").replace(/^\/+/, "").replace(/\/+$/, "");
  const i = normalized.lastIndexOf("/");
  const folder = i < 0 ? "" : normalized.slice(0, i);
  const basename = i < 0 ? normalized : normalized.slice(i + 1);
  if (!basename) return false;

  const page = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(folder, {
      limit: page,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const hits = data || [];
    if (hits.some((o) => o.name === basename)) return true;
    if (hits.length < page) break;
    offset += page;
  }
  return false;
}

function sanitizeReviewStatusSegment(reviewStatus) {
  const s = sanitizeSlug(reviewStatus);
  return s || "unknown";
}

async function uploadRawReferenceImageToSupabase(opts) {
  const admin = opts.admin || getSupabaseAdminClient();
  const bucket = rawBucketId();
  const slug = sanitizeSlug(opts.strainSlug);
  const hash = String(opts.contentHash || "").trim();
  const ext = String(opts.ext || "jpg")
    .replace(/^\./, "")
    .toLowerCase();
  const rsSeg = sanitizeReviewStatusSegment(opts.reviewStatus || "unknown");
  const objectPath = `raw/${rsSeg}/${slug}/${hash}.${ext}`;
  const buf = await fs.readFile(path.resolve(opts.localPath));

  const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, buf, {
    upsert: true,
    contentType: contentTypeForExt(ext),
    cacheControl: "86400",
  });
  if (upErr) throw upErr;

  return { bucket, path: objectPath };
}

async function uploadReferenceImageToSupabase(opts) {
  const admin = opts.admin || getSupabaseAdminClient();
  const bucket = referenceBucketId();
  const slug = sanitizeSlug(opts.strainSlug);
  const hash = String(opts.contentHash || "").trim();
  const ext = String(opts.ext || "jpg")
    .replace(/^\./, "")
    .toLowerCase();
  const objectPath = `references/${slug}/${hash}.${ext}`;
  const buf = await fs.readFile(path.resolve(opts.localPath));

  const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, buf, {
    upsert: true,
    contentType: contentTypeForExt(ext),
    cacheControl: "86400",
  });
  if (upErr) throw upErr;

  return { bucket, path: objectPath };
}

/**
 * @param {{ localPath: string, strainSlug: string, contentHash: string, ext: string, admin?: import('@supabase/supabase-js').SupabaseClient }} opts
 */
async function uploadTrainingImageToSupabase(opts) {
  const admin = opts.admin || getSupabaseAdminClient();
  const bucket = trainingBucketId();
  const ext = String(opts.ext || "jpg")
    .replace(/^\./, "")
    .toLowerCase();
  const objectPath = trainingImageStoragePath(
    opts.strainSlug,
    opts.contentHash,
    ext,
  );
  const buf = await fs.readFile(path.resolve(opts.localPath));

  const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, buf, {
    upsert: true,
    contentType: contentTypeForExt(ext),
    cacheControl: "86400",
  });
  if (upErr) throw upErr;

  return { bucket, path: objectPath };
}

/**
 * Public URL when bucket is public; otherwise short-lived signed URL.
 * @param {string} bucket
 * @param {string} objectPath
 * @param {{ admin?: import('@supabase/supabase-js').SupabaseClient, signedSeconds?: number }} [opts]
 */
async function getPublicOrSignedUrl(bucket, objectPath, opts = {}) {
  const admin = opts.admin || getSupabaseAdminClient();
  const seconds = opts.signedSeconds ?? 3600;
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(objectPath);
  const { data: buckets } = await admin.storage.listBuckets();
  const meta = (buckets || []).find((b) => (b.name || b.id) === bucket);
  const isPublic = meta?.public === true;
  if (isPublic && pub?.publicUrl) {
    return { url: pub.publicUrl, kind: "public" };
  }
  const { data: signed, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, seconds);
  if (error) throw error;
  return { url: signed.signedUrl, kind: "signed", expiresIn: seconds };
}

module.exports = {
  getSupabaseAdminClient,
  ensureScannerBuckets,
  uploadReferenceImageToSupabase,
  uploadRawReferenceImageToSupabase,
  uploadTrainingImageToSupabase,
  trainingImageStoragePath,
  storageObjectExists,
  getPublicOrSignedUrl,
  referenceBucketId,
  trainingBucketId,
  rawBucketId,
};
