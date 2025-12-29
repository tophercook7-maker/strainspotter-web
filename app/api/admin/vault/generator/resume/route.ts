import "server-only";
/**
 * POST /api/admin/vault/generator/resume
 * Signals external generator process to resume
 * This endpoint does NOT generate directly - it only sends a signal
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

    console.log("[admin/vault/generator/resume] Sending resume signal");

    // Write flag file to signal external generator to resume
    const flagFile = writeFlag("generator_resume", body);

    // Auto-trigger embeddings refresh after generation (default behavior)
    // This can be disabled by passing { skipEmbeddings: true } in body
    if (!body.skipEmbeddings) {
      writeFlag("embeddings_refresh", { mode: "all", triggeredBy: "generator_resume" });
      console.log("[admin/vault/generator/resume] Also queued embeddings refresh");
    }

    return NextResponse.json({
      ok: true,
      message: "Generator resume signal sent",
      flag: flagFile,
      embeddingsQueued: !body.skipEmbeddings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[admin/vault/generator/resume] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send generator resume signal" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
