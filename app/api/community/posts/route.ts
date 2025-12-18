import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/app/api/_utils/supabaseAdmin";

// GET /api/community/posts?group_category=X&group_id=Y
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const groupCategory = searchParams.get("group_category");
    const groupId = searchParams.get("group_id");

    if (!groupCategory || !groupId) {
      return NextResponse.json(
        { error: "group_category and group_id are required" },
        { status: 400 }
      );
    }

    // Get posts with user email from auth
    const { data: posts, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("group_category", groupCategory)
      .eq("group_id", groupId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    // Get user emails using admin client
    const userIds = [...new Set((posts || []).map((p: any) => p.user_id))];
    const userMap = new Map();
    
    if (!supabaseAdmin) {
      console.error("⚠️ supabaseAdmin is null - cannot fetch user emails");
    }
    
    if (supabaseAdmin && userIds.length > 0) {
      try {
        // Get emails from auth
        const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
        if (listUsersError) {
          console.error("❌ Error listing users:", listUsersError);
        } else {
          const userCount = users?.length || 0;
          console.log(`✅ Fetched ${userCount} users from auth`);
          users?.forEach((u) => {
            if (u.email) {
              userMap.set(u.id, u.email);
            }
          });
          console.log(`✅ userMap now has ${userMap.size} entries`);
        }
        
        // Try to get usernames from profiles (handle both user_id and id columns)
        try {
          // Try user_id column first
          const { data: profilesByUserId } = await supabaseAdmin
            .from("profiles")
            .select("user_id, id, username, email")
            .in("user_id", userIds);
          
          if (profilesByUserId && profilesByUserId.length > 0) {
            profilesByUserId.forEach((p: any) => {
              const uid = p.user_id;
              if (uid) {
                const displayName = p.username || p.email || userMap.get(uid);
                if (displayName) {
                  userMap.set(uid, displayName);
                }
              }
            });
          }
          
          // Also try id column (for older schema)
          const { data: profilesById } = await supabaseAdmin
            .from("profiles")
            .select("id, username, email")
            .in("id", userIds);
          
          if (profilesById && profilesById.length > 0) {
            profilesById.forEach((p: any) => {
              if (p.id && !userMap.has(p.id)) {
                const displayName = p.username || p.email || userMap.get(p.id);
                if (displayName) {
                  userMap.set(p.id, displayName);
                }
              }
            });
          }
        } catch (profileErr) {
          // If profiles query fails, just use emails
          console.error("Error fetching profiles:", profileErr);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    }

    const data = (posts || []).map((post: any) => {
      const displayName = userMap.get(post.user_id);
      let username = "Anonymous";
      
      if (displayName) {
        // Extract email username part if it's an email
        username = displayName.includes("@") 
          ? displayName.split("@")[0] 
          : displayName;
        // Never use user ID as username - check if it looks like a UUID
        if (username === post.user_id || username.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          username = "Anonymous";
        }
      } else {
        // If no display name found, try to get it from the regular supabase client as fallback
        console.log(`⚠️ No display name for user_id: ${post.user_id}, userMap size: ${userMap.size}`);
      }
      
      // Final safety check - if username is still a UUID or user ID, use Anonymous
      if (username && (username === post.user_id || username.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        username = "Anonymous";
      }
      
      // Never return user ID as username
      if (username === post.user_id || username.startsWith("user")) {
        username = "Anonymous";
      }
      
      return {
        ...post,
        user: {
          id: post.user_id,
          username: username || "Anonymous",
        },
      };
    });

    return NextResponse.json({ posts: data || [] });
  } catch (err: any) {
    console.error("Error in GET /api/community/posts:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/community/posts
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { group_category, group_id, post_type, title, body: postBody } = body;

    if (!group_category || !group_id || !post_type || !title || !postBody) {
      return NextResponse.json(
        { error: "group_category, group_id, post_type, title, and body are required" },
        { status: 400 }
      );
    }

    if (!["question", "experience", "observation", "tip"].includes(post_type)) {
      return NextResponse.json(
        { error: "Invalid post_type" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { data: post, error } = await supabase
      .from("community_posts")
      .insert({
        group_category,
        group_id,
        user_id: user.id,
        post_type,
        title: title.trim(),
        body: postBody.trim(),
        status: "published",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return NextResponse.json(
        { error: "Failed to create post" },
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
      ...post,
      user: {
        id: post.user_id,
        username: username,
      },
    };

    if (error) {
      console.error("Error creating post:", error);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/community/posts:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
