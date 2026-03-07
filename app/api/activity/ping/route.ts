import { NextResponse } from "next/server";
import { createServerClient } from "@/app/_server/supabase/server";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";

export async function POST() {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database unavailable. Missing Supabase configuration." },
        { status: 503 }
      );
    }
    const gardenId = await getPublicGardenId(supabase);
    const now = new Date().toISOString();

    // Try to update gardens table if last_active_at column exists
    const { data, error } = await supabase
      .from("gardens")
      .update({ last_active_at: now })
      .eq("id", gardenId)
      .select("id, last_active_at")
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        ok: true,
        storage: "gardens",
        garden_id: gardenId,
        last_active_at: data.last_active_at,
      });
    }

    // Fallback: store activity ping in scans so we can compute last open
    const { data: insData, error: insError } = await supabase
      .from("scans")
      .insert([
        {
          garden_id: gardenId,
          status: "done",
          image_url: "data:application/json,activity_ping",
          result_payload: { kind: "activity_ping", ts: now },
        },
      ])
      .select("id");

    if (insError) {
      return NextResponse.json(
        { error: "Could not record activity ping.", detail: insError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      storage: "scans",
      garden_id: gardenId,
      ts: now,
      id: insData?.[0]?.id,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Activity ping failed.",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
