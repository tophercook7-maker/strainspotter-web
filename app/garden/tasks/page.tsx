"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_at?: string;
  created_at: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gardenId, setGardenId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        // First, get user's active grow/garden
        const growsResponse = await fetch("/api/garden/grows", {
          credentials: "include",
        });

        if (growsResponse.ok) {
          const growsData = await growsResponse.json();
          const growsArray = Array.isArray(growsData?.grows) ? growsData.grows : Array.isArray(growsData) ? growsData : [];
          
          if (growsArray.length > 0) {
            const activeGardenId = growsArray[0].id;
            setGardenId(activeGardenId);

            // Fetch tasks for this garden
            const tasksResponse = await fetch(`/api/garden/tasks?garden_id=${activeGardenId}&status=open`, {
              credentials: "include",
            });

            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              setTasks(Array.isArray(tasksData?.tasks) ? tasksData.tasks : []);
            } else {
              // API might not be fully implemented, show empty state
              setTasks([]);
            }
          } else {
            // No grows yet, show empty state
            setTasks([]);
          }
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error("Error loading tasks:", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-4">
        <Link href="/garden" className="text-emerald-400 text-sm hover:text-emerald-300 transition">
          ← Back to Garden
        </Link>
        <Link
          href="/garden/tasks/new"
          className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
        >
          + New Task
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Tasks</h1>
      <p className="opacity-85 mb-6">
        Your grow checklist and reminders.
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm mb-4">
          {error}
        </div>
      )}

      {!gardenId ? (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700">
          <p className="text-sm text-neutral-400 mb-3">
            Create a grow first to start adding tasks.
          </p>
          <Link
            href="/garden/logbook/new"
            className="inline-block px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
          >
            Create a Grow
          </Link>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 text-center">
          <p className="text-sm text-neutral-400 mb-3">
            No tasks yet. Create your first task to get started.
          </p>
          <Link
            href="/garden/tasks/new"
            className="inline-block px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
          >
            Create Task
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-neutral-400 mb-2">{task.description}</p>
                  )}
                  {task.due_at && (
                    <p className="text-xs text-neutral-500">
                      Due: {new Date(task.due_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
