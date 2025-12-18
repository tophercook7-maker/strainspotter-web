import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// GET /api/community/summaries/list
// Returns summaries for groups the user has activity in
export async function GET(req: NextRequest) {
  try {
    // STEP 8: Kill switch check
    if (process.env.COMMUNITY_INTELLIGENCE_ENABLED === 'false') {
      return NextResponse.json({ summaries: [] });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ summaries: [] });
    }

    const supabase = await createSupabaseServer();

    // Get groups user has seen (or has posts/replies in)
    const { data: seenGroups } = await supabase
      .from("community_user_seen")
      .select("category, group_id")
      .eq("user_id", user.id);

    // Also check posts/replies
    const { data: userPosts } = await supabase
      .from("community_posts")
      .select("group_category, group_id")
      .eq("user_id", user.id)
      .limit(1);

    const { data: userReplies } = await supabase
      .from("community_replies")
      .select("post_id")
      .eq("user_id", user.id)
      .limit(1);

    // Get post group info if user has replies
    let replyGroups: any[] = [];
    if (userReplies && userReplies.length > 0) {
      const postIds = userReplies.map(r => r.post_id);
      const { data: posts } = await supabase
        .from("community_posts")
        .select("group_category, group_id")
        .in("id", postIds);
      replyGroups = posts || [];
    }

    // Combine unique groups
    const groupSet = new Set<string>();
    [...(seenGroups || []), ...(userPosts || []), ...replyGroups].forEach(g => {
      const key = `${g.group_category || g.group_category || 'unknown'}/${g.group_id || 'unknown'}`;
      groupSet.add(key);
    });

    if (groupSet.size === 0) {
      return NextResponse.json({ summaries: [] });
    }

    // Fetch summaries for these groups
    const summaries = [];
    for (const key of groupSet) {
      const [category, groupId] = key.split('/');
      const { data } = await supabase
        .from("community_group_summaries")
        .select("*")
        .eq("category", category)
        .eq("group_id", groupId)
        .order("week_start", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        summaries.push(data);
      }
    }

    return NextResponse.json({ summaries });
  } catch (err: any) {
    console.error("Error in GET /api/community/summaries/list:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
