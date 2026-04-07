import { NextResponse } from "next/server";
import { createServerClient } from "@/app/_server/supabase/server";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

function devDebug(error: unknown) {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) return {};
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return { debug: { message: e.message, code: e.code, details: e.details, hint: e.hint } };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function checkIngestAuth(req: Request): NextResponse | null {
  const envKey = process.env.GARDEN_CONSOLE_INGEST_KEY;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !envKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noCacheHeaders });
  }
  if (envKey) {
    const headerKey = req.headers.get("x-ingest-key")?.trim() ?? "";
    if (headerKey !== envKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noCacheHeaders });
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const authError = checkIngestAuth(req);
    if (authError) return authError;

    const supabase = createServerClient();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    // Single garden default: Public Garden
    const gardenId = b.garden_id != null && b.garden_id !== "" ? String(b.garden_id) : await getPublicGardenId(supabase);

    const recordedAtRaw = b.recorded_at;
    const recorded_at =
      typeof recordedAtRaw === "string" && recordedAtRaw.trim() !== "" ? recordedAtRaw : new Date().toISOString();

    const insertRow = {
      garden_id: gardenId,
      temp_f: numOrNull(b.temp_f),
      rh: numOrNull(b.rh),
      vpd: numOrNull(b.vpd),
      ph: numOrNull(b.ph),
      nitrogen_ppm: numOrNull(b.nitrogen_ppm),
      phosphorus_ppm: numOrNull(b.phosphorus_ppm),
      potassium_ppm: numOrNull(b.potassium_ppm),
      source: typeof b.source === "string" ? b.source.slice(0, 64) : null,
      recorded_at,
    };

    const { data, error } = await supabase
      .from("garden_sensor_readings")
      .insert(insertRow)
      .select("id")
      .single();

    if (error || !data) {
      console.error("[console/ingest] insert failed", error);
      return NextResponse.json(
        { error: "insert_failed", ...devDebug(error ?? new Error("No data returned")) },
        { status: 500, headers: noCacheHeaders }
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    const isDev = process.env.NODE_ENV !== "production";
    console.error("[console/ingest] error", err);
    return NextResponse.json(
      {
        error: "server_error",
        ...(isDev ? { debug: { message: (err as Error).message } } : {}),
      },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
