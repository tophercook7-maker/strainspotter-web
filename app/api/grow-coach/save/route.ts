import { NextResponse } from "next/server";
import { createServerClient } from "@/app/_server/supabase/server";

type Scale = "home" | "craft" | "commercial";
type Phase =
  | "setup"
  | "seedling"
  | "veg"
  | "flower"
  | "harvest"
  | "dry_cure";

type SaveRequest = {
  phase: Phase;
  scale: Scale;
  env?: Record<string, unknown>;
  notes?: string;
  recentSignals?: {
    tags?: string[];
    lastPrimaryLabel?: string;
  };
  plan: {
    headline: string;
    flavor?: string;
    actions?: string[];
    watchouts?: string[];
    questions?: string[];
    confidence?: number;
  };
};

/** Resolve Public Garden id for anonymous entries. */
async function getPublicGardenId(
  supabase: ReturnType<typeof createServerClient>
): Promise<string> {
  const { data: existing } = await supabase
    .from("gardens")
    .select("id")
    .is("user_id", null)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: inserted, error } = await supabase
    .from("gardens")
    .insert({ user_id: null, name: "Public Garden" })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    throw new Error(
      "Could not ensure Public Garden: " + (error?.message ?? "no id")
    );
  }
  return inserted.id;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SaveRequest | null;

  if (!body?.phase || !body?.scale || !body?.plan?.headline) {
    return NextResponse.json(
      { error: "Missing required fields: phase, scale, plan.headline" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database unavailable. Missing Supabase configuration." },
      { status: 503 }
    );
  }

  const payload = {
    kind: "grow_coach_plan",
    phase: body.phase,
    scale: body.scale,
    env: body.env ?? null,
    notes: body.notes ?? null,
    recentSignals: body.recentSignals ?? null,
    plan: body.plan,
  };

  // Insert into scans first so the plan appears in Log Book (History reads from scans only)
  try {
    const gardenId = await getPublicGardenId(supabase);
    const now = new Date().toISOString();

    // Use result_payload (v1 schema). image_url placeholder for non-image entries.
    const { data, error } = await supabase
      .from("scans")
      .insert([
        {
          user_id: null,
          garden_id: gardenId,
          status: "done",
          processed_at: now,
          image_url: "data:application/json,grow_coach_plan",
          result_payload: {
            version: "1.0",
            kind: "grow_coach_plan",
            ...payload,
          },
        },
      ])
      .select("id");

    if (!error && data?.[0]?.id) {
      return NextResponse.json({
        ok: true,
        storage: "scans",
        id: data[0].id,
      });
    }

    return NextResponse.json(
      {
        error: "Could not save to Log Book. Check Supabase scans table schema.",
        detail: (error as Error)?.message ?? String(error),
      },
      { status: 500 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: "Save failed.",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
