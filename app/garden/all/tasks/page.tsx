"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function GardenTasksPage() {
  const searchParams = useSearchParams();
  const [gardenId, setGardenId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  useEffect(() => {
    // Check for pre-filled text from URL
    const prefillTitle = searchParams.get("title");
    if (prefillTitle) {
      setTitle(decodeURIComponent(prefillTitle));
      setShowForm(true);
    }

    fetch("/api/garden/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.garden?.id) {
          setGardenId(data.garden.id);
          fetchTasks(data.garden.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
      });
  }, [searchParams, prefillApplied, title]);

  const fetchTasks = (id: string) => {
    fetch(`/api/garden/tasks?garden_id=${id}&status=open`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err);
        setLoading(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!gardenId) {
      setError("Garden not found. Please refresh the page.");
      return;
    }
    
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/garden/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garden_id: gardenId, title: title.trim() }),
        credentials: "include",
      });
      
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("Invalid response from server");
      }
      
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create task");
      }
      
      if (data.task) {
        // Add new task to the beginning of the list
        setTasks([data.task, ...tasks]);
        setTitle("");
        setShowForm(false);
        setSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error("Task created but not returned");
      }
    } catch (err: any) {
      console.error("Error adding task:", err);
      setError(err?.message || "Failed to create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDone = async (taskId: string) => {
    try {
      const res = await fetch(`/api/garden/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
        credentials: "include",
      });
      if (res.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16 }}>
      <Link href="/garden/all" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Overview
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold"
        >
          {showForm ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-6">
          {error && (
            <div className="mb-3 p-3 bg-red-900/40 border border-red-700 text-red-100 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 p-3 bg-emerald-900/40 border border-emerald-700 text-emerald-100 rounded-lg text-sm">
              ✓ Task created successfully!
            </div>
          )}
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null); // Clear error when user types
            }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
            required
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !title.trim() || !gardenId}
            className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Add Task"}
          </button>
          {!gardenId && (
            <p className="mt-2 text-sm text-yellow-400">
              ⚠️ Garden not loaded. Please refresh the page.
            </p>
          )}
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-8 text-center">
          <p className="text-gray-300 mb-2">No open tasks yet.</p>
          <p className="text-gray-500 text-sm mb-4">Add a task to track things you need to do for your grow.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Add your first task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-bold">{task.title}</div>
                {task.due_at && (
                  <div className="text-sm text-gray-400">
                    Due: {new Date(task.due_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleToggleDone(task.id)}
                className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold text-sm"
              >
                Mark Done
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
