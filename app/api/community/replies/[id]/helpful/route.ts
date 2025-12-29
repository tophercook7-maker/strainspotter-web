import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// POST /api/community/replies/[id]/helpful
// Mark a reply as helpful (moderators only)
import "server-only";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createSupabaseServer();

    // Check if user is a moderator
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isModerator = profile?.role === "moderator" ||
                       profile?.role === "admin" ||
                       profile?.role === "grower_moderator" ||
                       profile?.role === "enthusiast";

    if (!isModerator) {
      return NextResponse.json({ error: "Forbidden - Moderator access required" }, { status: 403 });
    }

    // Mark reply as helpful
    const { data, error } = await supabase
      .from("community_replies")
      .update({
        is_helpful: true,
        marked_helpful_by: user.id,
        marked_helpful_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error marking reply as helpful:", error);
      return NextResponse.json(
        { error: "Failed to mark reply as helpful" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: data });
  } catch (err: any) {
    console.error("Error in POST /api/community/replies/[id]/helpful:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/community/replies/[id]/helpful
// Unmark a reply as helpful (moderators only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createSupabaseServer();

    // Check if user is a moderator
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isModerator = profile?.role === "moderator" ||
                       profile?.role === "admin" ||
                       profile?.role === "grower_moderator" ||
                       profile?.role === "enthusiast";

    if (!isModerator) {
      return NextResponse.json({ error: "Forbidden - Moderator access required" }, { status: 403 });
    }

    // Unmark reply as helpful
    const { data, error } = await supabase
      .from("community_replies")
      .update({
        is_helpful: false,
        marked_helpful_by: null,
        marked_helpful_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error unmarking reply as helpful:", error);
      return NextResponse.json(
        { error: "Failed to unmark reply as helpful" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: data });
  } catch (err: any) {
    console.error("Error in DELETE /api/community/replies/[id]/helpful:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
