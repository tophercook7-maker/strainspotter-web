import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// GET /api/community/summaries?category=X&group_id=Y
export async function GET(req: NextRequest) {
  try {
    // STEP 8: Kill switch check
    if (process.env.COMMUNITY_INTELLIGENCE_ENABLED === 'false') {
      return NextResponse.json({ summary: null });
    }

    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const groupId = searchParams.get("group_id");

    if (!category || !groupId) {
      return NextResponse.json(
        { error: "category and group_id are required" },
        { status: 400 }
      );
    }

    // Get most recent summary for this group
    const { data, error } = await supabase
      .from("community_group_summaries")
      .select("*")
      .eq("category", category)
      .eq("group_id", groupId)
      .order("week_start", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error fetching summary:", error);
      return NextResponse.json(
        { error: "Failed to fetch summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: data || null });
  } catch (err: any) {
    console.error("Error in GET /api/community/summaries:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
