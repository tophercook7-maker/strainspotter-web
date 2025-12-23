"use client";

import React, { useState, useEffect } from "react";
import SaveToGardenActions from "./SaveToGardenActions";
import AIContextCard from "./AIContextCard";

interface Reply {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string | null;
  };
  ai_moderation_warning?: string;
  is_helpful?: boolean;
  moderation_reason?: string;
  status?: string;
}

interface ReplyCardProps {
  reply: Reply;
  currentUserId?: string;
  currentUserRole?: string;
  onUpdate: () => void;
}

export default function ReplyCard({ reply, currentUserId, currentUserRole, onUpdate }: ReplyCardProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  const [submitting, setSubmitting] = useState(false);
  const [aiContexts, setAiContexts] = useState<any[]>([]);

  const isOwner = currentUserId === reply.user.id;
  const isModerator = currentUserRole === "moderator" || 
                     currentUserRole === "admin" || 
                     currentUserRole === "grower_moderator" ||
                     currentUserRole === "enthusiast";
  const isHelpful = reply.is_helpful || false;
  
  // Debug: Log moderator status (only once per component)
  React.useEffect(() => {
    if (currentUserRole) {
      console.log(`ReplyCard - Role: ${currentUserRole}, isModerator: ${isModerator}`);
    }
  }, [currentUserRole, isModerator]);
  const isHidden = reply.status === "hidden" || reply.status === "deleted";

  useEffect(() => {
    loadAIContext();
  }, [reply.id]);

  const loadAIContext = async () => {
    try {
      const res = await fetch(`/api/community/ai-context?reply_id=${reply.id}`);
      const data = await res.json();
      setAiContexts(data.contexts || []);
    } catch (err) {
      console.error("Error loading AI context:", err);
    }
  };

  const handleMarkHelpful = async () => {
    try {
      const res = await fetch(`/api/community/replies/${reply.id}/helpful`, {
        method: isHelpful ? "DELETE" : "POST",
      });

      if (!res.ok) throw new Error("Failed to update helpful status");
      onUpdate();
    } catch (err) {
      alert("Failed to update helpful status");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reply?")) return;

    try {
      const res = await fetch(`/api/community/replies/${reply.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete reply");
      onUpdate();
    } catch (err) {
      alert("Failed to delete reply");
    }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/replies/${reply.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: editBody.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update reply");
      setEditing(false);
      onUpdate();
    } catch (err) {
      alert("Failed to update reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!confirm("Report this reply to moderators?")) return;

    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_id: reply.id,
          reason: "User reported",
        }),
      });

      if (res.ok) {
        alert("Reply reported. Thank you for helping keep the community safe.");
      }
    } catch (err) {
      alert("Failed to report reply");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white text-sm resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={submitting}
            className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditBody(reply.body);
            }}
            className="px-3 py-1 text-xs bg-white/15 text-white rounded-lg hover:bg-white/25 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (isHidden) {
    return (
      <div className="space-y-1 opacity-50">
        <div className="rounded bg-red-500/10 border border-red-500/20 p-2">
          <p className="text-xs text-red-300 mb-1">This reply has been hidden</p>
          {reply.moderation_reason && (
            <p className="text-xs text-red-200/80">{reply.moderation_reason}</p>
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
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Helpful Badge */}
      {isHelpful && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span>✓</span>
          <span className="font-medium">Marked as Helpful</span>
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

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/60">
              {reply.user.username && reply.user.username !== reply.user.id 
                ? reply.user.username 
                : "Anonymous"}
            </span>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs text-white/60">{formatDate(reply.created_at)}</span>
          </div>
          {reply.ai_moderation_warning && (
            <div className="mb-1 rounded bg-yellow-500/10 border border-yellow-500/20 p-1.5">
              <p className="text-xs text-yellow-300">⚠️ {reply.ai_moderation_warning}</p>
            </div>
          )}
          <p className="text-sm text-white/80 whitespace-pre-wrap">{reply.body}</p>

          {/* Save to Garden Actions (only for helpful replies) */}
          {isHelpful && (
            <SaveToGardenActions reply={{ body: reply.body, id: reply.id, user: reply.user }} />
          )}
        </div>
        <div className="flex flex-col gap-2 ml-2">
          {isModerator && (
            <button
              onClick={handleMarkHelpful}
              className={`text-xs px-2 py-1 rounded transition ${
                isHelpful
                  ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                  : "text-white/60 hover:text-white border border-white/10"
              }`}
            >
              {isHelpful ? "✓ Helpful" : "Mark Helpful"}
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
    </div>
  );
}
