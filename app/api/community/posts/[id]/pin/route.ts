import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// POST /api/community/posts/[id]/pin
// Pin a post (moderators only)
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

    // Pin post
    const { data, error } = await supabase
      .from("community_posts")
      .update({
        is_pinned: true,
        pinned_by: user.id,
        pinned_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error pinning post:", error);
      return NextResponse.json(
        { error: "Failed to pin post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post: data });
  } catch (err: any) {
    console.error("Error in POST /api/community/posts/[id]/pin:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/community/posts/[id]/pin
// Unpin a post (moderators only)
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

    // Unpin post
    const { data, error } = await supabase
      .from("community_posts")
      .update({
        is_pinned: false,
        pinned_by: null,
        pinned_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error unpinning post:", error);
      return NextResponse.json(
        { error: "Failed to unpin post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post: data });
  } catch (err: any) {
    console.error("Error in DELETE /api/community/posts/[id]/pin:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
