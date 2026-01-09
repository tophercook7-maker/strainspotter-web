import "server-only";
/**
 * GET /api/admin/vault/completeness
 * Get completeness data for strains (paginated)
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/adminAuth";
import { listCompleteness, getCompletenessStats } from "@/lib/vault/completeness";

export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 200);
    const offset = Number(searchParams.get("offset") || 0);
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = getCompletenessStats();
      return NextResponse.json({ stats });
    }

    const data = listCompleteness(limit, offset);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[admin/vault/completeness] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch completeness data" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
