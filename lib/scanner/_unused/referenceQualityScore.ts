/**
 * Reference image row quality score for audits and gates (TypeScript).
 * Node scripts use referenceQualityScore.js (duplicate logic — keep in sync).
 */

export type ReferenceQualityContext = {
  targetSlug?: string;
  targetName?: string;
  duplicateAcrossUnrelatedStrains?: boolean;
};

export type ReferenceRowLike = {
  strainSlug?: string;
  strainName?: string;
  sourceName?: string;
  reviewStatus?: string;
  imageUrl?: string;
  sourcePageUrl?: string;
  localPath?: string;
  width?: number | null;
  height?: number | null;
};

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

function normalizeToSlug(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function targetContainsTerm(targetHay: string, term: string): boolean {
  if (!targetHay) return false;
  if (term === "-x-") return /\bx\b|[-_]x[-_]/i.test(targetHay);
  return targetHay.includes(term.replace(/-/g, ""));
}

export function isPlaceholderUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return false;
  const s = url.trim();
  if (/^https?:\/\/\.{3}/i.test(s)) return true;
  if (/^https:\/\/\.\.\./i.test(s)) return true;
  if (/\.\.\.(?:\/|$)/.test(s)) return true;
  if (/\bplaceholder\b/i.test(s)) return true;
  if (/test\s*url/i.test(s)) return true;
  return false;
}

export function scoreReferenceRecord(row: ReferenceRowLike, ctx: ReferenceQualityContext = {}): number {
  let score = 0;
  const targetSlug = normalizeToSlug(ctx.targetSlug ?? row.strainSlug ?? "");
  const targetName = String(ctx.targetName ?? row.strainName ?? "").trim();
  const rowSlug = normalizeToSlug(row.strainSlug || "");
  const rowName = String(row.strainName || "").trim();
  const targetHay = `${targetName} ${targetSlug}`.toLowerCase();

  if (targetSlug && rowSlug === targetSlug) score += 30;
  if (targetName && rowName && targetName.toLowerCase() === rowName.toLowerCase()) score += 20;

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
