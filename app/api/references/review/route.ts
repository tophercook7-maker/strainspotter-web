import path from "node:path";
import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import {
  readReferenceImageRows,
  writeReferenceImageRows,
  filterExternalCandidates,
  applyReviewActionToRows,
  applyCatalogReviewBatch,
  applySkipReviewToRows,
  getReferenceImagesJsonlPath,
  getReviewBackupJsonlPath,
  countReviewBucket,
  serializeReviewItem,
  externalReviewDashboardStats,
  resolveDefaultReviewListStatus,
  normalizeReviewListStatusParam,
  type ReviewListStatus,
  type ReviewMatchParams,
} from "@/lib/server/referenceImagesJsonl";

/** Never cache catalog slices — stale data breaks review UX after POST mutations. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

function jsonResponse(data: unknown, init?: ResponseInit) {
  const h = new Headers(init?.headers);
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) {
    h.set(k, v);
  }
  return NextResponse.json(data, { ...init, headers: h });
}

function normalizeReviewCounts(bucket: {
  pending: number;
  approved: number;
  rejected: number;
  totalExternal: number;
  disabledPendingCount: number;
}) {
  return {
    pending: bucket.pending,
    approved: bucket.approved,
    rejected: bucket.rejected,
    total: bucket.totalExternal,
    totalExternal: bucket.totalExternal,
    disabledPendingCount: bucket.disabledPendingCount,
  };
}

function extractMatch(body: Record<string, unknown>): ReviewMatchParams {
  const idRaw = body.id;
  const id =
    typeof idRaw === "string"
      ? idRaw.trim()
      : idRaw != null
        ? String(idRaw).trim()
        : undefined;
  const catalogKey =
    typeof body.catalogKey === "string" ? body.catalogKey.trim() : undefined;
  const imageUrl =
    typeof body.imageUrl === "string"
      ? body.imageUrl.trim()
      : typeof body.image_url === "string"
        ? body.image_url.trim()
        : undefined;
  const strainSlug =
    typeof body.strainSlug === "string"
      ? body.strainSlug.trim()
      : typeof body.strain_slug === "string"
        ? body.strain_slug.trim()
        : undefined;
  return { id: id || undefined, catalogKey, imageUrl, strainSlug };
}

function matchParamsNonEmpty(m: ReviewMatchParams): boolean {
  return Boolean(
    (m.id && m.id.length > 0) ||
      (m.catalogKey && m.catalogKey.length > 0) ||
      (m.imageUrl && m.imageUrl.length > 0)
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get("status");
    const normalized = normalizeReviewListStatusParam(rawStatus);
    if (normalized === null) {
      return jsonResponse({ error: "Invalid status" }, { status: 400 });
    }

    const catalogPath = getReferenceImagesJsonlPath();
    const rows = readReferenceImageRows();
    const bucket = countReviewBucket(rows);
    const dashboard = externalReviewDashboardStats(rows);

    let effectiveStatus: ReviewListStatus = normalized;
    if (normalized === "auto") {
      effectiveStatus = resolveDefaultReviewListStatus(rows);
    }

    // `normalizeReviewListStatusParam` returns null for unknown tokens only.
    const filterStatus: ReviewListStatus =
      normalized === "auto" ? effectiveStatus : normalized;

    if (
      filterStatus === "auto" ||
      !["human", "pending-search", "pending", "approved", "rejected", "all"].includes(
        filterStatus
      )
    ) {
      return jsonResponse({ error: "Invalid resolved status" }, { status: 500 });
    }

    const strain = searchParams.get("strain");
    const source = searchParams.get("source");
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
      100
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const filtered = filterExternalCandidates(rows, {
      status: filterStatus,
      strain,
      source,
    });
    const total = filtered.length;
    const slice = filtered.slice(offset, offset + limit);
    const items = slice.map((r) => serializeReviewItem(r));

    if (process.env.NODE_ENV === "development") {
      const countsOut = normalizeReviewCounts(bucket);
      console.log("[references/review:get]", {
        status: filterStatus,
        returned: items.length,
        counts: countsOut,
        rawStatus: rawStatus ?? "(default auto)",
        requested: normalized,
        effectiveStatus,
        totalFiltered: total,
        dashboard: {
          humanReviewQueue: dashboard.humanReviewQueue,
          pendingExternalSearch: dashboard.pendingExternalSearch,
        },
      });
    }

    const payload: Record<string, unknown> = {
      items,
      total,
      totalExternalCandidates: bucket.totalExternal,
      pending: bucket.pending,
      approved: bucket.approved,
      rejected: bucket.rejected,
      disabledPendingCount: bucket.disabledPendingCount,
      returned: items.length,
      offset,
      limit,
      counts: normalizeReviewCounts(bucket),
      dashboard,
      effectiveStatus,
      requestedStatus: normalized,
    };

    if (process.env.NODE_ENV === "development") {
      payload._debug = {
        catalogPath,
        catalogExists: fs.existsSync(catalogPath),
        rawRowCount: rows.length,
      };
    }

    return jsonResponse(payload);
  } catch (e) {
    console.error(e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawItems = body.items;

    const catalogPath = getReferenceImagesJsonlPath();
    if (!fs.existsSync(catalogPath)) {
      return jsonResponse(
        { error: "reference catalog not found" },
        { status: 404 }
      );
    }

    const rows = readReferenceImageRows();
    const backupPath = getReviewBackupJsonlPath();
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(catalogPath, backupPath);

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const defaultRejectReason =
        typeof body.defaultRejectReason === "string"
          ? body.defaultRejectReason.trim()
          : "";

      const ops: Array<{
        match: ReviewMatchParams;
        action: "approve" | "reject" | "skip";
        reason?: string;
      }> = [];

      for (const entry of rawItems) {
        if (!entry || typeof entry !== "object") continue;
        const it = entry as Record<string, unknown>;
        const action = it.action;
        if (action !== "approve" && action !== "reject" && action !== "skip") {
          return jsonResponse(
            { error: "Each batch item needs action approve, reject, or skip" },
            { status: 400 }
          );
        }
        const match = extractMatch(it);
        if (!matchParamsNonEmpty(match)) {
          return jsonResponse(
            {
              error:
                "Each batch item needs id, catalogKey, or imageUrl (optionally strainSlug)",
            },
            { status: 400 }
          );
        }
        const itemReason =
          typeof it.reason === "string" ? it.reason.trim() : "";
        const reason =
          action === "reject"
            ? itemReason || defaultRejectReason || ""
            : itemReason;
        if (action === "reject" && !reason) {
          return jsonResponse(
            {
              error:
                "Reject batch items require reason or defaultRejectReason on the request",
            },
            { status: 400 }
          );
        }
        ops.push({
          match,
          action,
          reason:
            action === "reject"
              ? reason
              : action === "skip"
                ? itemReason || "Skipped for later"
                : "",
        });
      }

      if (ops.length === 0) {
        return jsonResponse(
          { error: "No valid batch items", updated: 0 },
          { status: 400 }
        );
      }

      const { rows: next, updated } = applyCatalogReviewBatch(rows, ops);
      if (updated === 0) {
        const hint =
          typeof ops[0]?.match?.imageUrl === "string"
            ? ops[0].match.imageUrl
            : undefined;
        return jsonResponse(
          {
            ok: false,
            error: "no_matching_reference_row",
            imageUrl: hint,
            updated: 0,
          },
          { status: 404 }
        );
      }
      writeReferenceImageRows(next);
      const bucket = countReviewBucket(next);
      if (process.env.NODE_ENV === "development") {
        console.log("[references/review] batch", {
          updated,
          counts: normalizeReviewCounts(bucket),
        });
      }
      return jsonResponse({
        ok: true,
        updated,
        counts: normalizeReviewCounts(bucket),
        batch: true,
      });
    }

    const match = extractMatch(body);
    if (!matchParamsNonEmpty(match)) {
      return jsonResponse(
        {
          error:
            "Provide id, catalogKey, or imageUrl (image_url accepted) to identify catalog row(s)",
        },
        { status: 400 }
      );
    }

    const action = body.action;
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";

    if (action !== "approve" && action !== "reject" && action !== "skip") {
      return jsonResponse(
        { error: "action must be approve, reject, or skip" },
        { status: 400 }
      );
    }

    const note = reason || "Skipped for later";
    const { rows: next, updated } =
      action === "skip"
        ? applySkipReviewToRows(rows, match, note)
        : applyReviewActionToRows(rows, match, action, reason);
    const primaryImageUrl =
      typeof match.imageUrl === "string" && match.imageUrl.trim()
        ? match.imageUrl.trim()
        : typeof body.imageUrl === "string"
          ? body.imageUrl.trim()
          : typeof body.image_url === "string"
            ? body.image_url.trim()
            : "";
    if (updated === 0) {
      return jsonResponse(
        {
          ok: false,
          error: "no_matching_reference_row",
          imageUrl: primaryImageUrl || undefined,
          updated: 0,
        },
        { status: 404 }
      );
    }
    writeReferenceImageRows(next);
    const bucket = countReviewBucket(next);
    if (process.env.NODE_ENV === "development") {
      console.log("[references/review] action", {
        action,
        imageUrl: primaryImageUrl,
        updated,
      });
    }

    return jsonResponse({
      ok: true,
      updated,
      counts: normalizeReviewCounts(bucket),
    });
  } catch (e) {
    console.error(e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
