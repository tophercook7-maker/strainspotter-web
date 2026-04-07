import { NextResponse } from "next/server";
import { getLatestGardenSensorReading } from "@/lib/garden/getLatestGardenSensorReading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const { gardenId, reading } = await getLatestGardenSensorReading();
    return NextResponse.json({ gardenId, reading }, { headers: noCacheHeaders });
  } catch (error) {
    const isDev = process.env.NODE_ENV !== "production";
    console.error("[console] read failed", error);
    return NextResponse.json(
      {
        error: "console_read_failed",
        ...(isDev
          ? {
              debug: {
                message: (error as Error).message,
                code: (error as { code?: string }).code,
                details: (error as { details?: string }).details,
                hint: (error as { hint?: string }).hint,
              },
            }
          : {}),
      },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
