"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to get user's active grow/garden
      let gardenId: string | null = null;
      try {
        const growsResponse = await fetch("/api/garden/grows", {
          credentials: "include",
        });
        if (growsResponse.ok) {
          const growsData = await growsResponse.json();
          const growsArray = Array.isArray(growsData?.grows) ? growsData.grows : Array.isArray(growsData) ? growsData : [];
          // Use the first active grow, or create without garden_id if none exists
          if (growsArray.length > 0) {
            gardenId = growsArray[0].id;
          }
        }
      } catch (growErr) {
        console.warn("Could not fetch grows for task:", growErr);
        // Continue without garden_id - API may handle it
      }

      // Try to create task via API
      const response = await fetch("/api/garden/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garden_id: gardenId || "default", // Use default if no garden found
          title: title.trim(),
          description: description.trim() || undefined,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = text ? JSON.parse(text) : null;
        } catch {
          errorData = { error: "Failed to create task" };
        }
        
        // If error is about garden_id, show helpful message
        if (errorData?.error?.includes("garden_id")) {
          setError("Please create a grow first, then add tasks to it.");
          setLoading(false);
          return;
        }
        
        throw new Error(errorData?.error || "Failed to create task");
      }

      const data = await response.json();
      // Redirect back to garden after successful creation
      router.push("/garden");
    } catch (err: any) {
      console.error("Error creating task:", err);
      setError(err.message || "Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
        ← Back to Garden
      </Link>

      <h1 className="text-3xl font-bold mb-2">Create a Task</h1>
      <p className="opacity-85 mb-6">
        Add a task to your grow checklist.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Task Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Check pH levels"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional details..."
            rows={4}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 py-3 px-4 bg-emerald-600 text-black rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
          <Link
            href="/garden"
            className="px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-xl font-semibold hover:bg-neutral-700 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
