import { NextRequest, NextResponse } from "next/server";
import {
  consumeOneScanForUser,
  getUserFromBearerRequest,
} from "@/lib/scanner/scanQuotaServer";

function statusForConsumeError(error: string): number {
  if (error === "Profile not found") return 404;
  if (
    error.includes("No scan allowance") ||
    error.includes("scan allowance remaining")
  ) {
    return 403;
  }
  return 500;
}

/** POST /api/scans/consume — record one successful scan against allowances. */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearerRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await consumeOneScanForUser(user.id);
    if (result.ok === false) {
      const status = statusForConsumeError(result.error);
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      entitlements: result.entitlements,
      consumedFrom: result.consumedFrom,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
