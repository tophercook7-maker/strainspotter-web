import "server-only";
/**
 * GET /api/admin/vault/flags
 * List all flags or read a specific flag
 * Admin-only endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/adminAuth";
import { listFlags, readFlag } from "@/lib/vault/flags";

export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (name) {
      const flag = readFlag(name);
      return NextResponse.json({ flag });
    }

    const flags = listFlags();
    return NextResponse.json({ flags });
  } catch (error: any) {
    console.error("[admin/vault/flags] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch flags" },
      { status: error.message?.includes("Admin") ? 403 : 500 }
    );
  }
}
