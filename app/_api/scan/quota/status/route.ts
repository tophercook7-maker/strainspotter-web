import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getQuotaStatus } from "@/app/api/_utils/scanQuota";

import "server-only";
/**
 * GET /api/scan/quota/status
 * Get user's current quota status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const status = await getQuotaStatus(user.id);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Error getting quota status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
