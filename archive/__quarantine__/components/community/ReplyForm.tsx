"use client";

import { useState } from "react";

interface ReplyFormProps {
  postId: string;
  onReplyCreated: () => void;
}

export default function ReplyForm({ postId, onReplyCreated }: ReplyFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Reply cannot be empty");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/community/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create reply");
      }

      setBody("");
      onReplyCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30 resize-none text-sm"
        placeholder="Write a reply..."
        required
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post Reply"}
        </button>
      </div>
    </form>
  );
}
