import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// POST /api/community/user-seen
// Track when user views a group
import "server-only";
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { category, group_id } = body;

    if (!category || !group_id) {
      return NextResponse.json(
        { error: "category and group_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Upsert user seen record
    const { error } = await supabase
      .from("community_user_seen")
      .upsert({
        user_id: user.id,
        category,
        group_id,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,category,group_id"
      });

    if (error) {
      console.error("Error updating user seen:", error);
      return NextResponse.json(
        { error: "Failed to update seen status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in POST /api/community/user-seen:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
