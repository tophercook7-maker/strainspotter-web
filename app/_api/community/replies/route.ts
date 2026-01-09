import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

// GET /api/community/replies?post_id=X
import "server-only";
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
    }

    const { data: replies, error } = await supabase
      .from("community_replies")
      .select("*")
      .eq("post_id", postId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching replies:", error);
      return NextResponse.json(
        { error: "Failed to fetch replies" },
        { status: 500 }
      );
    }

    // Get user emails using admin client
    const userIds = [...new Set((replies || []).map((r: any) => r.user_id))];
    const userMap = new Map();
    
    if (supabaseAdmin && userIds.length > 0) {
      try {
        // Get emails from auth
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        users?.forEach((u) => {
          if (u.email) {
            userMap.set(u.id, u.email);
          }
        });
        
        // Try to get usernames from profiles (handle both user_id and id columns)
        try {
          // Try user_id column first
          const { data: profilesByUserId } = await supabaseAdmin
            .from("profiles")
            .select("user_id, id, username, email")
            .in("user_id", userIds);
          
          profilesByUserId?.forEach((p: any) => {
            const uid = p.user_id;
            if (uid) {
              const displayName = p.username || p.email || userMap.get(uid);
              if (displayName) {
                userMap.set(uid, displayName);
              }
            }
          });
          
          // Also try id column (for older schema)
          const { data: profilesById } = await supabaseAdmin
            .from("profiles")
            .select("id, username, email")
            .in("id", userIds);
          
          profilesById?.forEach((p: any) => {
            if (p.id && !userMap.has(p.id)) {
              const displayName = p.username || p.email || userMap.get(p.id);
              if (displayName) {
                userMap.set(p.id, displayName);
              }
            }
          });
        } catch (profileErr) {
          console.error("Error fetching profiles:", profileErr);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    }

    const data = (replies || []).map((reply: any) => {
      const displayName = userMap.get(reply.user_id);
      let username = "Anonymous";
      
      if (displayName) {
        // Extract email username part if it's an email
        username = displayName.includes("@") 
          ? displayName.split("@")[0] 
          : displayName;
        // Never use user ID as username - check if it looks like a UUID
        if (username === reply.user_id || username.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          username = "Anonymous";
        }
      }
      
      // Final safety check - if username is still a UUID or user ID, use Anonymous
      if (username && (username === reply.user_id || username.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        username = "Anonymous";
      }
      
      return {
        ...reply,
        user: {
          id: reply.user_id,
          username: username || "Anonymous",
        },
      };
    });

    return NextResponse.json({ replies: data || [] });
  } catch (err: any) {
    console.error("Error in GET /api/community/replies:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/community/replies
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { post_id, body: replyBody } = body;

    if (!post_id || !replyBody) {
      return NextResponse.json(
        { error: "post_id and body are required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Verify post exists
    const { data: post } = await supabase
      .from("community_posts")
      .select("id")
      .eq("id", post_id)
      .eq("status", "published")
      .single();

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const { data: reply, error } = await supabase
      .from("community_replies")
      .insert({
        post_id,
        user_id: user.id,
        body: replyBody.trim(),
        status: "published",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating reply:", error);
      return NextResponse.json(
        { error: "Failed to create reply" },
        { status: 500 }
      );
    }

    // Get username from profile
    let username = "Anonymous";
    if (user.email) {
      // Extract email username part
      username = user.email.includes("@") 
        ? user.email.split("@")[0] 
        : user.email;
    }
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email")
        .eq("user_id", user.id)
        .single();
      
      if (profile?.username) {
        username = profile.username;
      } else if (profile?.email) {
        username = profile.email.includes("@") 
          ? profile.email.split("@")[0] 
          : profile.email;
      }
    } catch (err) {
      // Already have fallback from email above
    }

    const data = {
      ...reply,
      user: {
        id: reply.user_id,
        username: username,
      },
    };

    if (error) {
      console.error("Error creating reply:", error);
      return NextResponse.json(
        { error: "Failed to create reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: data }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/community/replies:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
