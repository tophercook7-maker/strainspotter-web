/**
 * GET /api/admin/vault/manifests/stats
 * Get manifest statistics
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/adminAuth";
import { getManifestStats } from "@/lib/vault/manifestBuilder";

export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAPI();

    const stats = getManifestStats();

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("[admin/vault/manifests/stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get manifest stats" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
