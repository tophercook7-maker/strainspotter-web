import "server-only";
/**
 * POST /api/admin/vault/scraper/resume
 * Signals external scraper process to resume
 * This endpoint does NOT scrape directly - it only sends a signal
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

    console.log("[admin/vault/scraper/resume] Sending resume signal");

    // Write flag file to signal external scraper to resume
    const flagFile = writeFlag("scraper_resume", body);

    return NextResponse.json({
      ok: true,
      message: "Scraper resume signal sent",
      flag: flagFile,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[admin/vault/scraper/resume] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send scraper resume signal" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
