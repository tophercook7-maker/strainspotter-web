import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { incrementScanUsage, ScanType, checkScanQuota, formatLimitReachedResponse } from "@/app/api/_utils/scanQuota";

/**
 * POST /api/scan/quota/use
 * Atomically check quota and increment usage
 * This is the ONLY way to use a scan - prevents race conditions
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type } = body as { type: ScanType };

    if (!type || (type !== 'id' && type !== 'doctor')) {
      return NextResponse.json(
        { error: "type must be 'id' or 'doctor'" },
        { status: 400 }
      );
    }

    // Atomically check and increment (database function handles both)
    const result = await incrementScanUsage(user.id, type);

    if (!result.success) {
      // Get quota status for structured error response
      const quotaCheck = await checkScanQuota(user.id, type);
      const limitResponse = formatLimitReachedResponse(quotaCheck, type);

      return NextResponse.json(
        {
          ...limitResponse,
          success: false,
          error: 'limit_reached', // Keep for backward compatibility
          reason: result.reason,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      id_scans_used: result.id_scans_used,
      doctor_scans_used: result.doctor_scans_used,
    });
  } catch (error: any) {
    console.error("Error using scan quota:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
