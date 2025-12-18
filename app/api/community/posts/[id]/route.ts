import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

// PUT /api/community/posts/[id]
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
    const { title, body: postBody } = body;

    if (!title || !postBody) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Verify ownership
    const { data: existingPost } = await supabase
      .from("community_posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: post, error } = await supabase
      .from("community_posts")
      .update({
        title: title.trim(),
        body: postBody.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating post:", error);
      return NextResponse.json(
        { error: "Failed to update post" },
        { status: 500 }
      );
    }

    // Get username
    let username = "Anonymous";
    if (supabaseAdmin) {
      try {
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(post.user_id);
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
            .or(`user_id.eq.${post.user_id},id.eq.${post.user_id}`)
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
      ...post,
      user: {
        id: post.user_id,
        username: username,
      },
    };

    if (error) {
      console.error("Error updating post:", error);
      return NextResponse.json(
        { error: "Failed to update post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post: data });
  } catch (err: any) {
    console.error("Error in PUT /api/community/posts/[id]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/community/posts/[id]
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
    const { data: existingPost } = await supabase
      .from("community_posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting status to 'deleted'
    const { error } = await supabase
      .from("community_posts")
      .update({ status: "deleted" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting post:", error);
      return NextResponse.json(
        { error: "Failed to delete post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in DELETE /api/community/posts/[id]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
