import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { checkScanQuota, ScanType } from "@/app/api/_utils/scanQuota";

import "server-only";
/**
 * GET /api/scan/quota/check?type=id|doctor
 * Check if user can perform a scan (authoritative server-side check)
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ScanType;

    if (!type || (type !== 'id' && type !== 'doctor')) {
      return NextResponse.json(
        { error: "type must be 'id' or 'doctor'" },
        { status: 400 }
      );
    }

    const quotaCheck = await checkScanQuota(user.id, type);

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: quotaCheck.reason,
          quota_exceeded: quotaCheck.reason === 'quota_exceeded',
          reset_at: quotaCheck.reset_at,
          remaining: quotaCheck.remaining,
          id_scans_used: quotaCheck.id_scans_used,
          doctor_scans_used: quotaCheck.doctor_scans_used,
          id_scans_limit: quotaCheck.id_scans_limit,
          doctor_scans_limit: quotaCheck.doctor_scans_limit,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
      reason: quotaCheck.reason,
      remaining: quotaCheck.remaining,
      reset_at: quotaCheck.reset_at,
      id_scans_used: quotaCheck.id_scans_used,
      doctor_scans_used: quotaCheck.doctor_scans_used,
      id_scans_limit: quotaCheck.id_scans_limit,
      doctor_scans_limit: quotaCheck.doctor_scans_limit,
    });
  } catch (error: any) {
    console.error("Error checking scan quota:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
