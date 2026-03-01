import { NextResponse } from "next/server";
import { createServerClient } from "@/app/_server/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

/** UUID-ish: 36 chars, hex and hyphens (e.g. Supabase uuid). */
const UUIDISH_REGEX = /^[0-9a-fA-F-]{36}$/;

/**
 * GET /api/scans/:id — Returns { status, result_payload } for poll loop (backend-first scanner).
 * Deterministic shape; no extra fields; no caching.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (id == null || typeof id !== "string") {
      return NextResponse.json({ error: "missing_id" }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    if (!UUIDISH_REGEX.test(id)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("scans")
      .select("status, result_payload")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(
      {
        status: data.status ?? null,
        result_payload: data.result_payload ?? null,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("GET /api/scans/[id]:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
