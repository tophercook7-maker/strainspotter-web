/**
 * GET /api/admin/vault/status
 * Returns Vault health, scraper status, and generator status
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/adminAuth";
import { checkVaultHealth } from "@/lib/vault/health";
import { getScraperStatus } from "@/lib/vault/scraperStatus";
import { getGeneratorStatus } from "@/lib/vault/generatorStatus";

export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAPI();

    console.log("[admin/vault/status] Fetching Vault status");

    const vault = checkVaultHealth();
    const scraper = getScraperStatus();
    const generator = getGeneratorStatus();

    return NextResponse.json({
      vault,
      scraper,
      generator,
    });
  } catch (error: any) {
    console.error("[admin/vault/status] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Vault status" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
