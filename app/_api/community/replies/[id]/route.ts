import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

// PUT /api/community/replies/[id]
import "server-only";
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { body: replyBody } = body;

    if (!replyBody) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Verify ownership
    const { data: existingReply } = await supabase
      .from("community_replies")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (existingReply.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: reply, error } = await supabase
      .from("community_replies")
      .update({
        body: replyBody.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating reply:", error);
      return NextResponse.json(
        { error: "Failed to update reply" },
        { status: 500 }
      );
    }

    // Get username
    let username = "Anonymous";
    if (supabaseAdmin) {
      try {
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(reply.user_id);
        if (authUser?.email) {
          username = authUser.email.includes("@") 
            ? authUser.email.split("@")[0] 
            : authUser.email;
        }
        
        // Try to get username from profiles
        try {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("username, email, user_id, id")
            .or(`user_id.eq.${reply.user_id},id.eq.${reply.user_id}`)
            .maybeSingle();
          
          if (profile?.username) {
            username = profile.username;
          } else if (profile?.email) {
            username = profile.email.includes("@") 
              ? profile.email.split("@")[0] 
              : profile.email;
          }
        } catch (profileErr) {
          // Already have fallback from email
        }
      } catch (err) {
        console.error("Error fetching username:", err);
      }
    }

    const data = {
      ...reply,
      user: {
        id: reply.user_id,
        username: username,
      },
    };

    if (error) {
      console.error("Error updating reply:", error);
      return NextResponse.json(
        { error: "Failed to update reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: data });
  } catch (err: any) {
    console.error("Error in PUT /api/community/replies/[id]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/community/replies/[id]
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

    // Verify ownership
    const { data: existingReply } = await supabase
      .from("community_replies")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (existingReply.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting status to 'deleted'
    const { error } = await supabase
      .from("community_replies")
      .update({ status: "deleted" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting reply:", error);
      return NextResponse.json(
        { error: "Failed to delete reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in DELETE /api/community/replies/[id]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
