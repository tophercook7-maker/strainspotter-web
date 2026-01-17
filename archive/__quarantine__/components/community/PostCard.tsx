"use client";

import React, { useState, useEffect } from "react";
import ReplyForm from "./ReplyForm";
import ReplyCard from "./ReplyCard";
import AIContextCard from "./AIContextCard";

interface Post {
  id: string;
  post_type: "question" | "experience" | "observation" | "tip";
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string | null;
  };
  ai_moderation_warning?: string;
  is_pinned?: boolean;
  moderation_reason?: string;
  status?: string;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  currentUserRole?: string;
  onUpdate: () => void;
}

export default function PostCard({ post, currentUserId, currentUserRole, onUpdate }: PostCardProps) {
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [submitting, setSubmitting] = useState(false);
  const [aiContexts, setAiContexts] = useState<any[]>([]);

  const isOwner = currentUserId === post.user.id;
  const isModerator = currentUserRole === "moderator" || 
                     currentUserRole === "admin" || 
                     currentUserRole === "grower_moderator" ||
                     currentUserRole === "enthusiast";
  
  // Debug: Log moderator status (only once per component mount)
  React.useEffect(() => {
    if (currentUserRole) {
      console.log(`PostCard - Role: ${currentUserRole}, isModerator: ${isModerator}`);
    }
  }, [currentUserRole, isModerator]);
  const isPinned = post.is_pinned || false;
  const isHidden = post.status === "hidden" || post.status === "deleted";

  useEffect(() => {
    loadAIContext();
  }, [post.id]);

  const loadAIContext = async () => {
    try {
      const res = await fetch(`/api/community/ai-context?post_id=${post.id}`);
      const data = await res.json();
      setAiContexts(data.contexts || []);
    } catch (err) {
      console.error("Error loading AI context:", err);
    }
  };

  const handlePin = async () => {
    try {
      const res = await fetch(`/api/community/posts/${post.id}/pin`, {
        method: isPinned ? "DELETE" : "POST",
      });

      if (!res.ok) throw new Error("Failed to update pin status");
      onUpdate();
    } catch (err) {
      alert("Failed to update pin status");
    }
  };

  useEffect(() => {
    loadReplies();
  }, [post.id]);

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await fetch(`/api/community/replies?post_id=${post.id}`);
      const data = await res.json();
      setReplies(data.replies || []);
    } catch (err) {
      console.error("Error loading replies:", err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete post");
      onUpdate();
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update post");
      setEditing(false);
      onUpdate();
    } catch (err) {
      alert("Failed to update post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!confirm("Report this post to moderators?")) return;

    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: post.id,
          reason: "User reported",
        }),
      });

      if (res.ok) {
        alert("Post reported. Thank you for helping keep the community safe.");
      }
    } catch (err) {
      alert("Failed to report post");
    }
  };

  const postTypeLabels = {
    question: "❓ Question",
    experience: "📝 Experience",
    observation: "👁️ Observation",
    tip: "💡 Tip",
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (editing) {
    return (
      <div className="rounded-xl bg-white/15 backdrop-blur-lg p-4 border border-white/20">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white mb-3"
        />
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white mb-3 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditTitle(post.title);
              setEditBody(post.body);
            }}
            className="px-4 py-2 bg-white/15 text-white rounded-lg hover:bg-white/25 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (isHidden) {
    return (
      <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-red-500/20 opacity-50">
        <div className="rounded bg-red-500/10 border border-red-500/20 p-3 mb-3">
          <p className="text-sm text-red-300 mb-1">This post has been hidden</p>
          {post.moderation_reason && (
            <p className="text-xs text-red-200/80">{post.moderation_reason}</p>
          )}
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-xs text-red-300 hover:text-red-200 transition underline"
            >
              Edit to appeal
            </button>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white/60 mb-2">{post.title}</h3>
        <p className="text-white/60 text-sm">{post.body.substring(0, 100)}...</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl backdrop-blur-lg p-4 border ${
      isPinned 
        ? "bg-emerald-500/10 border-emerald-500/30" 
        : "bg-white/10 border-white/20"
    }`}>
      {/* Pinned Label */}
      {isPinned && (
        <div className="flex items-center gap-2 mb-3 text-xs text-emerald-400">
          <span>📌</span>
          <span className="font-medium">Pinned</span>
        </div>
      )}

      {/* AI Context Cards */}
      {aiContexts.map((context) => (
        <AIContextCard
          key={context.id}
          contextType={context.context_type}
          message={context.message}
        />
      ))}

      {/* Post Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/60">{postTypeLabels[post.post_type]}</span>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs text-white/60">
              {post.user.username && post.user.username !== post.user.id 
                ? post.user.username 
                : "Anonymous"}
            </span>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs text-white/60">{formatDate(post.created_at)}</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>
        </div>
        <div className="flex flex-col gap-2">
          {isModerator && (
            <button
              onClick={handlePin}
              className={`text-xs px-2 py-1 rounded transition ${
                isPinned
                  ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                  : "text-white/60 hover:text-white border border-white/10"
              }`}
            >
              {isPinned ? "📌 Pinned" : "Pin"}
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-white/60 hover:text-white transition"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Delete
              </button>
            </>
          )}
          {!isOwner && !isModerator && (
            <button
              onClick={handleReport}
              className="text-xs text-white/60 hover:text-white transition"
            >
              Report
            </button>
          )}
        </div>
      </div>

      {/* AI Warning */}
      {post.ai_moderation_warning && (
        <div className="mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2">
          <p className="text-xs text-yellow-300">⚠️ {post.ai_moderation_warning}</p>
        </div>
      )}

      {/* Post Body */}
      <p className="text-white/80 whitespace-pre-wrap mb-4">{post.body}</p>

      {/* Reply Button */}
      <button
        onClick={() => setShowReplyForm(!showReplyForm)}
        className="text-sm text-emerald-400 hover:text-emerald-300 transition mb-3"
      >
        {showReplyForm ? "Cancel Reply" : "Reply"}
      </button>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mb-4">
          <ReplyForm
            postId={post.id}
            onReplyCreated={() => {
              setShowReplyForm(false);
              loadReplies();
            }}
          />
        </div>
      )}

      {/* Replies */}
      {loadingReplies ? (
        <div className="text-sm text-white/60">Loading replies...</div>
      ) : replies.length > 0 ? (
        <div className="mt-4 space-y-3 pl-4 border-l-2 border-white/10">
          {replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onUpdate={loadReplies}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
