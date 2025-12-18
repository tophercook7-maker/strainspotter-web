import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// GET /api/community/pattern-signals
// Returns active pattern signals (cross-group themes)
export async function GET(req: NextRequest) {
  try {
    // STEP 8: Kill switch check
    if (process.env.COMMUNITY_INTELLIGENCE_ENABLED === 'false') {
      return NextResponse.json({ signals: [] });
    }

    const supabase = await createSupabaseServer();

    // Get active signals (not expired)
    const { data, error } = await supabase
      .from("community_pattern_signals")
      .select("*")
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching pattern signals:", error);
      return NextResponse.json(
        { error: "Failed to fetch pattern signals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signals: data || [] });
  } catch (err: any) {
    console.error("Error in GET /api/community/pattern-signals:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
