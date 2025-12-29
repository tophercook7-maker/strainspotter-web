import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

// GET /api/community/what-you-missed
// Returns new pinned posts, helpful replies, and summaries since last visit
import "server-only";
export async function GET(req: NextRequest) {
  try {
    // STEP 8: Kill switch check
    if (process.env.COMMUNITY_INTELLIGENCE_ENABLED === 'false') {
      return NextResponse.json({ items: [] });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ items: [] });
    }

    const supabase = await createSupabaseServer();
    const items: any[] = [];

    // Get user's last seen times per group
    const { data: seenRecords } = await supabase
      .from("community_user_seen")
      .select("category, group_id, last_seen_at")
      .eq("user_id", user.id);

    if (!seenRecords || seenRecords.length === 0) {
      // First visit - return nothing
      return NextResponse.json({ items: [] });
    }

    // Check for new pinned posts
    for (const record of seenRecords) {
      const { data: pinnedPosts } = await supabase
        .from("community_posts")
        .select("id, title, group_category, group_id")
        .eq("group_category", record.category)
        .eq("group_id", record.group_id)
        .eq("is_pinned", true)
        .eq("status", "published")
        .gt("pinned_at", record.last_seen_at);

      if (pinnedPosts && pinnedPosts.length > 0) {
        items.push({
          type: "pinned_post",
          group_category: record.category,
          group_id: record.group_id,
          title: pinnedPosts[0].title,
          count: pinnedPosts.length,
        });
      }
    }

    // Check for new helpful replies
    for (const record of seenRecords) {
      const { data: helpfulReplies } = await supabase
        .from("community_replies")
        .select("id, post_id, marked_helpful_at")
        .eq("status", "published")
        .eq("is_helpful", true)
        .gt("marked_helpful_at", record.last_seen_at);

      if (helpfulReplies && helpfulReplies.length > 0) {
        // Get post info
        const postIds = [...new Set(helpfulReplies.map(r => r.post_id))];
        const { data: posts } = await supabase
          .from("community_posts")
          .select("id, group_category, group_id")
          .in("id", postIds)
          .eq("group_category", record.category)
          .eq("group_id", record.group_id);

        if (posts && posts.length > 0) {
          items.push({
            type: "helpful_reply",
            group_category: record.category,
            group_id: record.group_id,
            count: helpfulReplies.length,
          });
        }
      }
    }

    // Check for new weekly summaries
    for (const record of seenRecords) {
      const { data: summaries } = await supabase
        .from("community_group_summaries")
        .select("id, week_start")
        .eq("category", record.category)
        .eq("group_id", record.group_id)
        .gt("created_at", record.last_seen_at);

      if (summaries && summaries.length > 0) {
        items.push({
          type: "weekly_summary",
          group_category: record.category,
          group_id: record.group_id,
          week_start: summaries[0].week_start,
        });
      }
    }

    // Limit to 3 items
    return NextResponse.json({ items: items.slice(0, 3) });
  } catch (err: any) {
    console.error("Error in GET /api/community/what-you-missed:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
