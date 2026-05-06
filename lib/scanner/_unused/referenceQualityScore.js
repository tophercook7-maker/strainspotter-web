/**
 * Reference row quality score (Node scripts). Mirrors referenceQualityScore.ts.
 * Higher is better; severe issues stack large negatives.
 */

function normalizeToSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const VARIANT_TERMS = [
  "auto",
  "ryder",
  "cross",
  "early",
  "sour",
  "hindu",
  "grape",
  "purple",
  "super-skunk",
  "afghani",
  "afghanistan",
  "og-kush",
  "-x-",
];

function targetContainsTerm(targetHay, term) {
  if (!targetHay) return false;
  if (term === "-x-") return /\bx\b|[-_]x[-_]/i.test(targetHay);
  return targetHay.includes(term.replace(/-/g, ""));
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ targetSlug?: string; targetName?: string; duplicateAcrossUnrelatedStrains?: boolean }} [ctx]
 */
function scoreReferenceRecord(row, ctx = {}) {
  let score = 0;
  const targetSlug = normalizeToSlug(ctx.targetSlug ?? row.strainSlug ?? "");
  const targetName = String(ctx.targetName ?? row.strainName ?? "").trim();
  const rowSlug = normalizeToSlug(row.strainSlug || "");
  const rowName = String(row.strainName || "").trim();
  const targetHay = `${targetName} ${targetSlug}`.toLowerCase();

  if (targetSlug && rowSlug === targetSlug) score += 30;
  if (
    targetName &&
    rowName &&
    targetName.toLowerCase() === rowName.toLowerCase()
  ) {
    score += 20;
  }

  const src = String(row.sourceName || "").toLowerCase();
  if (
    src.includes("straincompass") ||
    src.includes("terpscout") ||
    src === "straincompass-auto-feed"
  ) {
    score += 15;
  }

  if (
    row.sourceName === "user-confirmed-scan" ||
    row.reviewStatus === "trusted_user_confirmed"
  ) {
    score += 20;
  }

  const hay = `${row.imageUrl || ""} ${row.sourcePageUrl || ""} ${row.sourceName || ""}`.toLowerCase();
  let variantPenalties = 0;
  for (const term of VARIANT_TERMS) {
    if (!hay.includes(term)) continue;
    if (targetContainsTerm(targetHay, term)) continue;
    variantPenalties += 1;
    score -= 30;
    if (variantPenalties >= 2) break;
  }

  if (ctx.duplicateAcrossUnrelatedStrains) score -= 25;

  if (
    /logo|placeholder|avatar|icon|seed|pack|package|banner/i.test(
      `${row.imageUrl || ""} ${row.sourcePageUrl || ""} ${row.localPath || ""}`
    )
  ) {
    score -= 20;
  }

  if (
    typeof row.width === "number" &&
    typeof row.height === "number" &&
    (row.width < 300 || row.height < 300)
  ) {
    score -= 20;
  }

  if (isPlaceholderUrl(row.imageUrl) || isPlaceholderUrl(row.sourcePageUrl)) {
    score -= 100;
  }

  return score;
}

function isPlaceholderUrl(url) {
  if (!url || typeof url !== "string") return false;
  const s = url.trim();
  if (/^https?:\/\/\.{3}/i.test(s)) return true;
  if (/^https:\/\/\.\.\./i.test(s)) return true;
  if (/\.\.\.(?:\/|$)/.test(s)) return true;
  if (/\bplaceholder\b/i.test(s)) return true;
  if (/test\s*url/i.test(s)) return true;
  return false;
}

module.exports = { scoreReferenceRecord, isPlaceholderUrl, normalizeToSlug };
