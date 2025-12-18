import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// GET /api/community/ai-context?post_id=X or ?reply_id=Y
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("post_id");
    const replyId = searchParams.get("reply_id");

    if ((!postId && !replyId) || (postId && replyId)) {
      return NextResponse.json(
        { error: "Either post_id or reply_id must be provided (not both)" },
        { status: 400 }
      );
    }

    const query = supabase
      .from("community_ai_context")
      .select("*")
      .order("created_at", { ascending: false });

    if (postId) {
      query.eq("post_id", postId);
    } else {
      query.eq("reply_id", replyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching AI context:", error);
      return NextResponse.json(
        { error: "Failed to fetch AI context" },
        { status: 500 }
      );
    }

    return NextResponse.json({ contexts: data || [] });
  } catch (err: any) {
    console.error("Error in GET /api/community/ai-context:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/community/ai-context
// Create AI context card (typically called by AI service)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { post_id, reply_id, context_type, message } = body;

    if ((!post_id && !reply_id) || (post_id && reply_id)) {
      return NextResponse.json(
        { error: "Either post_id or reply_id must be provided (not both)" },
        { status: 400 }
      );
    }

    if (!context_type || !message) {
      return NextResponse.json(
        { error: "context_type and message are required" },
        { status: 400 }
      );
    }

    if (!["safety", "legality", "method_note", "general"].includes(context_type)) {
      return NextResponse.json(
        { error: "Invalid context_type" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("community_ai_context")
      .insert({
        post_id: post_id || null,
        reply_id: reply_id || null,
        context_type,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating AI context:", error);
      return NextResponse.json(
        { error: "Failed to create AI context" },
        { status: 500 }
      );
    }

    return NextResponse.json({ context: data }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/community/ai-context:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
