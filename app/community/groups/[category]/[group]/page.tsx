"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import NewPostForm from "@/components/community/NewPostForm";
import PostCard from "@/components/community/PostCard";
import WeeklySummaryCard from "@/components/community/WeeklySummaryCard";


type ProfileRow = { role?: string | null };

interface GroupPageProps {
  params: Promise<{
    category: string;
    group: string;
  }>;
}

const groupData: Record<string, Record<string, { name: string; description: string }>> = {
  growers: {
    beginners: {
      name: "Beginner Growers",
      description: "A welcoming space for new growers to ask questions and learn the basics of cannabis cultivation.",
    },
    intermediate: {
      name: "Intermediate Growers",
      description: "For growers who have completed a few cycles and want to refine their techniques.",
    },
    advanced: {
      name: "Advanced Growers",
      description: "Deep technical discussions for experienced cultivators sharing advanced methods.",
    },
    commercial: {
      name: "Commercial Growers",
      description: "Business-focused discussions for professional cultivation operations.",
    },
  },
  strains: {
    indica: {
      name: "Indica Lovers",
      description: "Discussing indica-dominant strains, their effects, and growing characteristics.",
    },
    sativa: {
      name: "Sativa Enthusiasts",
      description: "Exploring sativa-dominant genetics and their unique growing requirements.",
    },
    hybrid: {
      name: "Hybrid Growers",
      description: "The best of both worlds - discussing hybrid strains and their versatility.",
    },
    landrace: {
      name: "Landrace Genetics",
      description: "Preserving and discussing original landrace strains from around the world.",
    },
  },
  regional: {
    "north-america": {
      name: "North America",
      description: "Growers from the United States, Canada, and Mexico sharing regional insights.",
    },
    europe: {
      name: "Europe",
      description: "European growers discussing cultivation in various climates and legal frameworks.",
    },
    asia: {
      name: "Asia Pacific",
      description: "Growers from Asia and the Pacific region sharing local knowledge.",
    },
    other: {
      name: "Other Regions",
      description: "Growers from around the world connecting and sharing experiences.",
    },
  },
  official: {
    announcements: {
      name: "Announcements",
      description: "Official StrainSpotter updates, new features, and important community news.",
    },
    support: {
      name: "Community Support",
      description: "Get help with StrainSpotter features, troubleshooting, and account questions.",
    },
    "feature-requests": {
      name: "Feature Requests",
      description: "Share ideas and vote on features you'd like to see in StrainSpotter.",
    },
  },
};

const communityRules = [
  "Be respectful and constructive in all discussions",
  "No sharing of illegal activities or content",
  "Keep discussions focused on growing and cannabis knowledge",
  "No spam, self-promotion, or off-topic posts",
  "Follow all local laws and regulations",
  "Moderators reserve the right to remove content that violates these rules",
];

export default function GroupPage({ params }: GroupPageProps) {
  const { category, group } = use(params);
  const groupInfo = groupData[category]?.[group];
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [currentUserRole, setCurrentUserRole] = useState<string | undefined>();

  useEffect(() => {
    loadPosts();
    loadCurrentUser();
    
    // Track user visit
    if (currentUserId) {
      fetch("/api/community/user-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, group_id: group }),
      }).catch(console.error);
    }
  }, [category, group, currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);

      // Get user role from profiles (try both user_id and id columns)
      if (user?.id) {
        try {
          // Try user_id first
          let { data: profile, error: profileError } = (await supabase
            .from("profiles")
            .select("role, user_id, id")
            .eq("user_id", user.id)
            .maybeSingle()) as unknown as { data: ProfileRow | null; error: any };
          
          // If not found, try id column
          if (!profile && !profileError) {
            const { data: profileById, error: profileByIdError } = (await supabase
              .from("profiles")
              .select("role, user_id, id")
              .eq("id", user.id)
              .maybeSingle()) as unknown as { data: ProfileRow | null; error: any };
            profile = profileById;
            profileError = profileByIdError;
          }
          
          if (profileError) {
            console.error("❌ Error fetching user role:", profileError);
          } else {
            console.log(`✅ User role: ${(profile as ProfileRow | null)?.role || "null"} for user: ${user.id}`);
            setCurrentUserRole(((profile as ProfileRow | null)?.role) ?? undefined);
          }
        } catch (err) {
          console.error("❌ Error fetching user role:", err);
        }
      }
    } catch (err) {
      console.error("Error loading user:", err);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/community/posts?group_category=${category}&group_id=${group}`
      );
      const data = await res.json();
      // Sort posts: pinned first, then by created_at
      const sortedPosts = (data.posts || []).sort((a: any, b: any) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setPosts(sortedPosts);
    } catch (err) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!groupInfo) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <Link href="/community" className="text-emerald-400 mb-4 inline-block text-sm">
          ← Back to Community
        </Link>
        <h1 className="text-2xl font-bold mb-4">Group Not Found</h1>
        <p className="text-white/70">This group doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <Link href="/community" className="text-emerald-400 mb-4 inline-block text-sm">
          ← Back to Community
        </Link>
        <h1 className="text-3xl font-semibold text-white mb-2">{groupInfo.name}</h1>
        <p className="text-white/80">{groupInfo.description}</p>
      </div>

      {/* Safety Notice */}
      <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20">
        <p className="text-sm text-white/90">
          Educational discussion only. No medical advice. Follow local laws.
        </p>
        <p className="text-xs text-white/60 mt-2">
          <Link href="/about" className="underline hover:text-white/80">
            What StrainSpotter Is / Isn't
          </Link>
        </p>
      </div>

      {/* Rules Section */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-lg font-semibold text-white mb-3">Group Rules</h2>
        <ul className="space-y-2">
          {communityRules.map((rule, index) => (
            <li key={index} className="text-sm text-white/80 flex items-start gap-2">
              <span className="text-white/60 mt-0.5">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Moderator Info */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-lg font-semibold text-white mb-3">Moderation</h2>
        <p className="text-sm text-white/80">
          This group is moderated by the StrainSpotter team to ensure a safe, educational environment.
          All discussions are reviewed before being made visible.
        </p>
        <p className="text-xs text-white/60 mt-3">
          AI moderation is in assist mode. AI may show warnings but does not automatically block content.
          Human moderators review all reports.
        </p>
      </section>

      {/* Weekly Summary */}
      <WeeklySummaryCard category={category} groupId={group} />

      {/* Discussions Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Discussions</h2>
          {currentUserId && (
            <button
              onClick={() => setShowNewPostForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              New Post
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-white/60 py-8">Loading discussions...</div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-lg p-12 border border-white/10 text-center">
            <p className="text-white/80 mb-2">No discussions yet.</p>
            <p className="text-sm text-white/60 mb-4">
              {currentUserId
                ? "Be the first to start a discussion in this group."
                : "Sign in to start a discussion."}
            </p>
            {currentUserId && (
              <button
                onClick={() => setShowNewPostForm(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm"
              >
                Start first discussion
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onUpdate={loadPosts}
              />
            ))}
          </div>
        )}
      </section>

      {/* New Post Form Modal */}
      {showNewPostForm && (
        <NewPostForm
          groupCategory={category}
          groupId={group}
          onClose={() => setShowNewPostForm(false)}
          onPostCreated={loadPosts}
        />
      )}
    </div>
  );
}
