"use client";

import { useState } from "react";

interface NewPostFormProps {
  groupCategory: string;
  groupId: string;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function NewPostForm({
  groupCategory,
  groupId,
  onClose,
  onPostCreated,
}: NewPostFormProps) {
  const [postType, setPostType] = useState<"question" | "experience" | "observation" | "tip">("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !body.trim()) {
      setError("Title and body are required");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_category: groupCategory,
          group_id: groupId,
          post_type: postType,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-black rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">New Post</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post Type */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Post Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["question", "experience", "observation", "tip"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPostType(type)}
                  className={`
                    px-4 py-2 rounded-lg border transition
                    ${
                      postType === type
                        ? "bg-white/20 border-white/40 text-white"
                        : "bg-white/10 border-white/15 text-white/80 hover:bg-white/15"
                    }
                  `}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
              placeholder="Enter post title"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Body <span className="text-red-400">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
              placeholder="Share your question, experience, observation, or tip..."
              required
            />
          </div>

          {/* Reminder */}
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <p className="text-sm text-yellow-300">
              ⚠️ <strong>Reminder:</strong> No medical advice. No illegal activity.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
