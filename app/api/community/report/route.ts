import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// POST /api/community/report
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { post_id, reply_id, reason } = body;

    if ((!post_id && !reply_id) || (post_id && reply_id)) {
      return NextResponse.json(
        { error: "Either post_id or reply_id must be provided (not both)" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Create report
    const { data, error } = await supabase
      .from("community_reports")
      .insert({
        user_id: user.id,
        post_id: post_id || null,
        reply_id: reply_id || null,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating report:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 }
      );
    }

    // Increment report count on the post or reply
    if (post_id) {
      const { data: post } = await supabase
        .from("community_posts")
        .select("report_count")
        .eq("id", post_id)
        .single();
      
      if (post) {
        await supabase
          .from("community_posts")
          .update({ report_count: (post.report_count || 0) + 1 })
          .eq("id", post_id);
      }
    } else if (reply_id) {
      const { data: reply } = await supabase
        .from("community_replies")
        .select("report_count")
        .eq("id", reply_id)
        .single();
      
      if (reply) {
        await supabase
          .from("community_replies")
          .update({ report_count: (reply.report_count || 0) + 1 })
          .eq("id", reply_id);
      }
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/community/report:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
