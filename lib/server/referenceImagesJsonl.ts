/**
 * Read/write scanner reference catalog (reference-images.jsonl) on the server.
 */

import fs from "node:fs";
import path from "node:path";
import {
  projectRoot,
  getReferenceImageStorageRoot,
  resolveReferenceLocalPath,
} from "@/lib/server/storagePaths";

export const EXTERNAL_SOURCE_NAMES = new Set([
  "brave-search",
  "serpapi",
  "google-custom-search",
]);

export function getReferenceImagesJsonlPath(): string {
  return path.join(
    projectRoot(),
    "data",
    "strain-reference-images",
    "reference-images.jsonl"
  );
}

export function getReviewBackupJsonlPath(): string {
  return path.join(
    projectRoot(),
    "data",
    "strain-reference-images",
    "reference-images.backup-before-review-change.jsonl"
  );
}

export function readReferenceImageRows(): Record<string, unknown>[] {
  const p = getReferenceImagesJsonlPath();
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, "utf8");
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

export function writeReferenceImageRows(rows: Record<string, unknown>[]): void {
  const p = getReferenceImagesJsonlPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const body =
    rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  fs.writeFileSync(p, body, "utf8");
}

/** Resolve a catalog `localPath` to an absolute file only when under allowed reference roots. */
export function resolveSafePreviewPath(localPath: string): string | null {
  if (!localPath || typeof localPath !== "string") return null;
  const t = localPath.trim();
  if (!t || t.split(/[/\\]/).includes("..")) return null;
  const abs = resolveReferenceLocalPath(t);
  const norm = path.normalize(abs);
  const roots = [
    path.normalize(getReferenceImageStorageRoot()),
    path.normalize(path.join(projectRoot(), "data", "strain-reference-images")),
  ];
  const allowed = roots.some((r) => norm === r || norm.startsWith(r + path.sep));
  if (!allowed) return null;
  if (!fs.existsSync(norm) || !fs.statSync(norm).isFile()) return null;
  return norm;
}

export function isExternalCandidateRow(row: Record<string, unknown>): boolean {
  const rs = String(row.reviewStatus ?? "");
  if (rs === "needs_review_external_search") return true;
  if (rs === "needs_human_review_external") return true;
  const s = String(row.sourceName ?? "").toLowerCase();
  return EXTERNAL_SOURCE_NAMES.has(s);
}

function slugify(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ReviewListStatus =
  | "human"
  | "pending-search"
  | "pending"
  | "approved"
  | "rejected"
  | "all"
  | "auto";

/** First non-empty queue for external-review: human → pending-search → pending (dual) → all. */
export function resolveDefaultReviewListStatus(rows: Record<string, unknown>[]): ReviewListStatus {
  const dash = externalReviewDashboardStats(rows);
  if (dash.humanReviewQueue > 0) return "human";
  if (dash.pendingExternalSearch > 0) return "pending-search";
  const ext = rows.filter(isExternalCandidateRow);
  const dualPending = ext.filter(
    (r) =>
      r.reviewStatus === "needs_human_review_external" ||
      r.reviewStatus === "needs_review_external_search"
  ).length;
  if (dualPending > 0) return "pending";
  return "all";
}

/** Map legacy client/query params to canonical ReviewListStatus. */
export function normalizeReviewListStatusParam(raw: string | null | undefined): ReviewListStatus | null {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t || t === "auto") return "auto";
  const legacy: Record<string, ReviewListStatus> = {
    needs_human: "human",
    "needs-human": "human",
    pending_external: "pending-search",
    "pending-external": "pending-search",
    pending_search: "pending-search",
    "pending-search": "pending-search",
  };
  if (legacy[t]) return legacy[t];
  if (t === "pending_all" || t === "pending-all") return "pending";
  if (t === "human") return "human";
  if (t === "pending-search") return "pending-search";
  if (t === "pending") return "pending";
  if (t === "approved") return "approved";
  if (t === "rejected") return "rejected";
  if (t === "all") return "all";
  return null;
}

/** Pending queue: includes disabled rows until approved — do not filter by disabled. */
export function isPendingExternalRow(row: Record<string, unknown>): boolean {
  if (row.reviewStatus === "needs_review_external_search") return true;
  const s = String(row.sourceName ?? "").toLowerCase();
  if (!EXTERNAL_SOURCE_NAMES.has(s)) return false;
  const rs = String(row.reviewStatus ?? "");
  if (rs === "approved_external_exact" || rs === "approved_external_auto" || rs === "rejected_external")
    return false;
  return true;
}

export function filterExternalCandidates(
  rows: Record<string, unknown>[],
  params: {
    status: ReviewListStatus;
    strain?: string | null;
    source?: string | null;
  }
): Record<string, unknown>[] {
  let out = rows.filter(isExternalCandidateRow);

  const { status, strain, source } = params;
  if (status === "human") {
    out = out.filter((r) => r.reviewStatus === "needs_human_review_external");
  } else if (status === "pending-search") {
    out = out.filter((r) => r.reviewStatus === "needs_review_external_search");
  } else if (status === "pending") {
    out = out.filter(
      (r) =>
        r.reviewStatus === "needs_human_review_external" ||
        r.reviewStatus === "needs_review_external_search"
    );
  } else if (status === "approved") {
    out = out.filter(
      (r) =>
        r.reviewStatus === "approved_external_exact" || r.reviewStatus === "approved_external_auto"
    );
  } else if (status === "rejected") {
    out = out.filter((r) => r.reviewStatus === "rejected_external");
  }

  const strainQ = strain?.trim().toLowerCase();
  if (strainQ) {
    out = out.filter((r) => {
      const slug = String(r.strainSlug ?? "");
      const name = String(r.strainName ?? "").toLowerCase();
      return (
        slugify(slug) === strainQ ||
        slugify(name) === strainQ ||
        name.includes(strainQ) ||
        slug.toLowerCase().includes(strainQ)
      );
    });
  }

  const sourceQ = source?.trim().toLowerCase();
  if (sourceQ) {
    out = out.filter(
      (r) => String(r.sourceName ?? "").toLowerCase() === sourceQ
    );
  }

  return out;
}

export function rowPrimaryImageUrl(row: Record<string, unknown>): string {
  if (typeof row.imageUrl === "string") return row.imageUrl.trim();
  if (typeof row.image_url === "string") return row.image_url.trim();
  return "";
}

export function rowPrimaryLocalPath(row: Record<string, unknown>): string {
  if (typeof row.localPath === "string") return row.localPath.trim();
  if (typeof row.local_path === "string") return row.local_path.trim();
  return "";
}

export function rowContentHash(row: Record<string, unknown>): string {
  if (typeof row.contentHash === "string") return row.contentHash.trim();
  if (typeof row.content_hash === "string") return row.content_hash.trim();
  return "";
}

function isSha256Hex(h: string): boolean {
  return typeof h === "string" && /^[a-f0-9]{64}$/i.test(h.trim());
}

/** Normalize URLs so UI/catalog comparisons stay stable (protocol, host casing, trailing slash, hash). */
export function canonicalImageUrl(url: string): string {
  const t = String(url ?? "").trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    u.hash = "";
    let out = u.href;
    if (out.endsWith("/") && u.pathname !== "/") {
      out = out.slice(0, -1);
    }
    return out;
  } catch {
    return t;
  }
}

/** `strainSlug::imageUrl` — imageUrl may include `:` (e.g. https:), so only first `::` splits slug. */
export function reviewCatalogKey(
  strainSlug: string,
  imageUrl: string
): string {
  return `${String(strainSlug || "").trim()}::${String(imageUrl || "").trim()}`;
}

export function parseReviewCatalogKey(
  catalogKey: string
): { strainSlug: string; imageUrl: string } | null {
  const ck = String(catalogKey || "").trim();
  const i = ck.indexOf("::");
  if (i <= 0) return null;
  return { strainSlug: ck.slice(0, i), imageUrl: ck.slice(i + 2) };
}

export type ReviewMatchParams = {
  id?: string;
  catalogKey?: string;
  imageUrl?: string;
  strainSlug?: string;
};

/** Canonical URLs stored on the row that might identify the same image (primary + alternates). */
function rowCanonicalImageUrlSet(row: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  const add = (u: unknown) => {
    if (typeof u !== "string") return;
    const c = canonicalImageUrl(u.trim());
    if (c) out.add(c);
  };
  add(row.imageUrl);
  add(row.image_url);
  add(row.originalImageUrl);
  add(row.original_image_url);
  add(row.originalImageUrlBackup);
  return out;
}

function rowStrainSlugKeys(row: Record<string, unknown>): { raw: string; norm: string } {
  const raw = String(row.strainSlug ?? row.strain_slug ?? "").trim();
  return { raw, norm: slugify(raw) };
}

export function rowMatchesReviewParams(
  row: Record<string, unknown>,
  params: ReviewMatchParams
): boolean {
  const pid = String(params.id ?? "").trim();
  if (pid) {
    const rid = row.id ?? row.catalog_id ?? row.catalogId;
    if (rid != null && String(rid) === pid) return true;
    /* Fall through: client may send stale/mismatched id; URL + strain still identify the row. */
  }
  const urlCandidates = rowCanonicalImageUrlSet(row);
  const pck = String(params.catalogKey ?? "").trim();
  if (pck) {
    const parsed = parseReviewCatalogKey(pck);
    if (parsed) {
      const { raw: rsRaw, norm: rsNorm } = rowStrainSlugKeys(row);
      const pkNorm = slugify(parsed.strainSlug);
      const slugOk =
        pkNorm === rsNorm || (rsRaw !== "" && parsed.strainSlug.trim() === rsRaw);
      if (slugOk) {
        const want = canonicalImageUrl(parsed.imageUrl);
        if (want && urlCandidates.has(want)) return true;
      }
    }
  }
  const img = canonicalImageUrl(params.imageUrl || "");
  if (!img) return false;
  if (!urlCandidates.has(img)) return false;
  const ss = String(params.strainSlug ?? "").trim();
  if (ss) {
    const { norm: rsNorm, raw: rsRaw } = rowStrainSlugKeys(row);
    const qn = slugify(ss);
    if (qn !== rsNorm && ss.trim() !== rsRaw) return false;
  }
  return true;
}

export function serializeReviewItem(
  row: Record<string, unknown>
): Record<string, unknown> {
  const strainSlug = String(row.strainSlug ?? row.strain_slug ?? "");
  const imageUrl = rowPrimaryImageUrl(row);
  const localPathRaw =
    typeof row.localPath === "string"
      ? row.localPath
      : typeof row.local_path === "string"
        ? row.local_path
        : "";
  const lp = String(localPathRaw || "").trim();

  const safeAbs = lp ? resolveSafePreviewPath(lp) : null;
  const localFileExists = safeAbs !== null;
  const previewUrl = localFileExists
    ? `/api/references/preview?localPath=${encodeURIComponent(lp)}`
    : imageUrl || "";

  const rid = row.id ?? row.catalog_id ?? row.catalogId;
  const originalImageUrlRaw =
    typeof row.originalImageUrl === "string"
      ? row.originalImageUrl.trim()
      : typeof row.original_image_url === "string"
        ? row.original_image_url.trim()
        : "";
  const out: Record<string, unknown> = {
    strainName: String(row.strainName ?? row.strain_name ?? ""),
    strainSlug,
    imageUrl,
    catalogKey: reviewCatalogKey(strainSlug, imageUrl),
    sourcePageUrl: String(row.sourcePageUrl ?? row.source_page_url ?? ""),
    sourceName: String(row.sourceName ?? row.source_name ?? ""),
    localPath: lp,
    previewUrl,
    localFileExists,
    reviewStatus: String(row.reviewStatus ?? row.review_status ?? ""),
    disabled: row.disabled === true,
    disabledReason: String(row.disabledReason ?? row.disabled_reason ?? ""),
    trustLevel: String(row.trustLevel ?? row.trust_level ?? ""),
    status: String(row.status ?? ""),
    reviewNote: String(row.reviewNote ?? row.review_note ?? ""),
    contentHashPresent: isSha256Hex(rowContentHash(row)),
    imageUrlPreview:
      imageUrl.length > 80 ? `${imageUrl.slice(0, 80)}…` : imageUrl,
  };
  if (originalImageUrlRaw) out.originalImageUrl = originalImageUrlRaw;
  if (rid != null) out.id = String(rid);
  return out;
}

export function applyReviewActionToRows(
  rows: Record<string, unknown>[],
  match: ReviewMatchParams,
  action: "approve" | "reject",
  reason: string
): { rows: Record<string, unknown>[]; updated: number } {
  const rejectReason = reason.trim() || "Rejected in review";
  let updated = 0;
  const next = rows.map((row) => {
    if (!rowMatchesReviewParams(row, match)) return row;
    updated += 1;
    const rawUrl = rowPrimaryImageUrl(row);
    const fallbackUrl = String(match.imageUrl ?? "").trim();
    const parsed = match.catalogKey
      ? parseReviewCatalogKey(match.catalogKey)
      : null;
    const imageUrlOut =
      rawUrl ||
      (parsed?.imageUrl ? parsed.imageUrl.trim() : "") ||
      canonicalImageUrl(fallbackUrl);
    if (action === "approve") {
      const lp = rowPrimaryLocalPath(row);
      const ch = rowContentHash(row);
      const hasPath = Boolean(lp);
      const hasHash = isSha256Hex(ch);
      return {
        ...row,
        imageUrl: imageUrlOut,
        disabled: false,
        reviewStatus: "approved_external_exact",
        trustLevel: "medium",
        disabledReason: "",
        status: hasPath && hasHash ? "downloaded" : "pending",
      };
    }
    return {
      ...row,
      imageUrl: imageUrlOut,
      disabled: true,
      reviewStatus: "rejected_external",
      trustLevel: "low",
      disabledReason: rejectReason,
      status: "skipped",
    };
  });
  return { rows: next, updated };
}

export function applySkipReviewToRows(
  rows: Record<string, unknown>[],
  match: ReviewMatchParams,
  note: string
): { rows: Record<string, unknown>[]; updated: number } {
  const text = note.trim() || "Skipped for later";
  let updated = 0;
  const next = rows.map((row) => {
    if (!rowMatchesReviewParams(row, match)) return row;
    if (row.reviewStatus !== "needs_human_review_external") return row;
    updated += 1;
    return {
      ...row,
      reviewNote: text,
      review_note: text,
    };
  });
  return { rows: next, updated };
}

export function applyCatalogReviewBatch(
  rows: Record<string, unknown>[],
  ops: Array<{
    match: ReviewMatchParams;
    action: "approve" | "reject" | "skip";
    reason?: string;
  }>
): { rows: Record<string, unknown>[]; updated: number } {
  let current = rows;
  let updated = 0;
  for (const op of ops) {
    if (op.action === "skip") {
      const { rows: next, updated: n } = applySkipReviewToRows(
        current,
        op.match,
        op.reason ?? "Skipped for later"
      );
      current = next;
      updated += n;
    } else {
      const { rows: next, updated: n } = applyReviewActionToRows(
        current,
        op.match,
        op.action,
        op.action === "reject" ? op.reason ?? "" : ""
      );
      current = next;
      updated += n;
    }
  }
  return { rows: current, updated };
}

export function externalReviewDashboardStats(rows: Record<string, unknown>[]) {
  const ext = rows.filter(isExternalCandidateRow);
  const autoRejected = (r: Record<string, unknown>) =>
    r.reviewStatus === "rejected_external" &&
    typeof r.disabledReason === "string" &&
    r.disabledReason.startsWith("[auto-review]");
  let approvedEligibleForSync = 0;
  for (const r of ext) {
    if (
      (r.reviewStatus !== "approved_external_exact" &&
        r.reviewStatus !== "approved_external_auto") ||
      r.disabled === true ||
      r.status !== "downloaded"
    ) {
      continue;
    }
    const lp = rowPrimaryLocalPath(r);
    const ch = rowContentHash(r);
    if (!lp || !isSha256Hex(ch)) continue;
    if (fs.existsSync(resolveReferenceLocalPath(lp))) approvedEligibleForSync += 1;
  }
  return {
    humanReviewQueue: ext.filter((r) => r.reviewStatus === "needs_human_review_external")
      .length,
    pendingExternalSearch: ext.filter(
      (r) => r.reviewStatus === "needs_review_external_search"
    ).length,
    autoApproved: ext.filter((r) => r.reviewStatus === "approved_external_auto").length,
    humanApproved: ext.filter((r) => r.reviewStatus === "approved_external_exact").length,
    rejectedExternal: ext.filter((r) => r.reviewStatus === "rejected_external").length,
    autoRejectedExternal: ext.filter(autoRejected).length,
    approvedEligibleForSync,
  };
}

export function countReviewBucket(
  rows: Record<string, unknown>[]
): {
  pending: number;
  approved: number;
  rejected: number;
  totalExternal: number;
  disabledPendingCount: number;
} {
  const ext = rows.filter(isExternalCandidateRow);
  const pendingRows = ext.filter(isPendingExternalRow);
  return {
    totalExternal: ext.length,
    pending: pendingRows.length,
    approved: ext.filter(
      (r) =>
        r.reviewStatus === "approved_external_exact" || r.reviewStatus === "approved_external_auto"
    ).length,
    rejected: ext.filter((r) => r.reviewStatus === "rejected_external").length,
    disabledPendingCount: pendingRows.filter((r) => r.disabled === true).length,
  };
}
