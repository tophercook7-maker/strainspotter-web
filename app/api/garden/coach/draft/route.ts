import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST - Get AI draft for next log entry
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", details: "Authentication required" },
        { status: 401 }
      );
    }

    const { grow_id } = body;
    if (!grow_id) {
      return NextResponse.json(
        { error: "missing_fields", details: "grow_id required" },
        { status: 400 }
      );
    }

    // Fetch grow details
    const { data: grow, error: growError } = await supabase
      .from("grows")
      .select("*")
      .eq("id", grow_id)
      .eq("user_id", user.id)
      .single();

    if (growError || !grow) {
      return NextResponse.json(
        { error: "grow_not_found", details: "Grow not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch last log entry
    const { data: lastLog } = await supabase
      .from("grow_logs")
      .select("*")
      .eq("grow_id", grow_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // TODO: Call AI service here
    // For now, return structured mock response
    const draft = generateMockDraft(grow, lastLog);
    
    return NextResponse.json(draft);
  } catch (err: any) {
    console.error("DRAFT ERROR:", err);
    return NextResponse.json(
      { error: "server_error", details: err.message },
      { status: 500 }
    );
  }
}

// Mock AI draft generator (replace with actual AI call)
function generateMockDraft(grow: any, lastLog: any | null) {
  const daysSinceStart = Math.floor(
    (new Date().getTime() - new Date(grow.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const stage = grow.stage;
  const stageTemplates: Record<string, string> = {
    seed: `Day ${daysSinceStart + 1} - Seedling check:\n- Germination status\n- Soil moisture\n- Temperature observations`,
    veg: `Day ${daysSinceStart + 1} - Vegetative growth:\n- Leaf development\n- Height/stretch observations\n- Watering schedule`,
    flower: `Day ${daysSinceStart + 1} - Flowering stage:\n- Bud development\n- Trichome observations\n- Nutrient schedule`,
    dry: `Day ${daysSinceStart + 1} - Drying:\n- Humidity levels\n- Drying progress\n- Stem snap test`,
    cure: `Day ${daysSinceStart + 1} - Curing:\n- Jar humidity\n- Aroma development\n- Texture observations`,
  };

  const suggestedNote = lastLog
    ? `Continuing from yesterday's observations. Today I noticed...`
    : stageTemplates[stage] || `Day ${daysSinceStart + 1} log entry:`;

  const quickToggles = [
    { label: "Watered", key: "watered" },
    { label: "Fed nutrients", key: "nutrients" },
    { label: "Checked pH", key: "ph_checked" },
  ];

  return {
    suggestedNote,
    quickToggles,
    stage: grow.stage,
  };
}
