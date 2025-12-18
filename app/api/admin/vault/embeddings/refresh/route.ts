/**
 * POST /api/admin/vault/embeddings/refresh
 * Queue embeddings refresh for strains
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/adminAuth";
import { writeFlag } from "@/lib/vault/flags";

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAPI();

    const body = await req.json().catch(() => ({}));
    // Optional: { slug: "<strain-slug>" } or { mode: "all" }

    console.log("[admin/vault/embeddings/refresh] Queueing embeddings refresh:", body);

    const flagFile = writeFlag("embeddings_refresh", body);

    return NextResponse.json({
      ok: true,
      message: "Embeddings refresh queued",
      flag: flagFile,
      payload: body,
    });
  } catch (error: any) {
    console.error("[admin/vault/embeddings/refresh] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to queue embeddings refresh" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
