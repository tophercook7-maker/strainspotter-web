"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlantTaskAction, completePlantTaskAction, completeAndScheduleNextTaskAction, applyPlantRecipeAction } from "@/app/actions/plants";
import type { PlantTask } from "@/lib/plants/plantsRepo";

const TASK_KINDS = [
  "note",
  "watering",
  "feeding",
  "training",
  "pest",
  "deficiency",
  "harvest",
  "photo",
] as const;

const RECIPE_OPTIONS = [
  { value: "", label: "Apply recipe…" },
  { value: "water_2d_14", label: "Watering cadence (every 2 days, 14 days)" },
  { value: "feed_3d_21", label: "Feeding cadence (every 3 days, 21 days)" },
  { value: "ipm_7d_28", label: "IPM checks (every 7 days, 28 days)" },
] as const;

type Props = {
  plantId: string;
  gardenId: string;
  tasks: PlantTask[];
};

function dueLabel(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);
  if (due < now) return "Overdue";
  if (due >= startOfToday && due <= endOfToday) return "Due today";
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

export default function TasksCard({ plantId, gardenId, tasks }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipeKey, setRecipeKey] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [completeLoadingId, setCompleteLoadingId] = useState<string | null>(null);
  const [completeAndNextLoadingId, setCompleteAndNextLoadingId] = useState<string | null>(null);
  const [skippedNextMessage, setSkippedNextMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("plantId", plantId);
    formData.set("gardenId", gardenId);
    const result = await createPlantTaskAction(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error === "invalid_input" ? "Title and due date required." : "Failed to add task.");
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
  }

  async function handleApplyRecipe() {
    if (!recipeKey) return;
    setError(null);
    setApplyLoading(true);
    const formData = new FormData();
    formData.set("plantId", plantId);
    formData.set("gardenId", gardenId);
    formData.set("recipeKey", recipeKey);
    const result = await applyPlantRecipeAction(formData);
    setApplyLoading(false);
    if ("error" in result) {
      setError(result.error === "invalid_input" ? "Select a recipe." : "Failed to apply recipe.");
      return;
    }
    setRecipeKey("");
    router.refresh();
  }

  async function handleComplete(taskId: string) {
    setError(null);
    setSkippedNextMessage(false);
    setCompleteLoadingId(taskId);
    const formData = new FormData();
    formData.set("taskId", taskId);
    const result = await completePlantTaskAction(formData);
    setCompleteLoadingId(null);
    if ("error" in result) {
      setError("Failed to complete.");
      return;
    }
    router.refresh();
  }

  const CADENCE_KINDS = ["watering", "feeding", "pest"] as const;
  function isCadenceKind(kind: string) {
    return CADENCE_KINDS.includes(kind.toLowerCase() as (typeof CADENCE_KINDS)[number]);
  }

  async function handleCompleteAndNext(taskId: string) {
    setError(null);
    setSkippedNextMessage(false);
    setCompleteAndNextLoadingId(taskId);
    const formData = new FormData();
    formData.set("taskId", taskId);
    const result = await completeAndScheduleNextTaskAction(formData);
    setCompleteAndNextLoadingId(null);
    if ("error" in result) {
      setError(
        result.error === "invalid_input"
          ? "Invalid task."
          : result.error === "not_cadence"
            ? "Not a cadence task."
            : "Failed to schedule next."
      );
      return;
    }
    if ("skipped_next" in result && result.skipped_next) {
      setSkippedNextMessage(true);
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <h2 className="text-white font-medium mb-3">Tasks</h2>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={recipeKey}
          onChange={(e) => setRecipeKey(e.target.value)}
          disabled={applyLoading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white text-sm focus:border-white/40 focus:outline-none disabled:opacity-50"
        >
          {RECIPE_OPTIONS.map((opt) => (
            <option key={opt.value || "placeholder"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApplyRecipe}
          disabled={!recipeKey || applyLoading}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors disabled:opacity-50"
        >
          {applyLoading ? "Applying…" : "Apply"}
        </button>
      </div>
      {skippedNextMessage && (
        <p className="text-sm text-amber-400/90 mb-2">Completed. Next already scheduled.</p>
      )}
      {tasks.length === 0 ? (
        <p className="text-sm text-white/50">No open tasks.</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {tasks.map((task) => {
            const taskLoading = completeLoadingId === task.id || completeAndNextLoadingId === task.id;
            return (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/10 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-white/90 text-sm font-medium">{task.title}</span>
                  <span className="text-xs text-white/50 ml-2">{task.kind}</span>
                  <p className="text-xs text-white/50 mt-0.5">
                    {dueLabel(task.due_at)}
                    {task.notes && ` — ${task.notes.slice(0, 40)}${task.notes.length > 40 ? "…" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleComplete(task.id)}
                    disabled={taskLoading}
                    className="px-2 py-1 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 transition-colors"
                  >
                    {completeLoadingId === task.id ? "…" : "Complete"}
                  </button>
                  {isCadenceKind(task.kind) && (
                    <button
                      type="button"
                      onClick={() => handleCompleteAndNext(task.id)}
                      disabled={taskLoading}
                      className="px-2 py-1 rounded text-xs font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 transition-colors"
                    >
                      {completeAndNextLoadingId === task.id ? "…" : "Complete + Next"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
      >
        {open ? "Cancel" : "Add task"}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-white/90 mb-1">
              Title *
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              required
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="task-kind" className="block text-sm font-medium text-white/90 mb-1">
              Kind
            </label>
            <select
              id="task-kind"
              name="kind"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            >
              {TASK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-due_at" className="block text-sm font-medium text-white/90 mb-1">
              Due date *
            </label>
            <input
              id="task-due_at"
              name="due_at"
              type="datetime-local"
              required
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="task-notes" className="block text-sm font-medium text-white/90 mb-1">
              Notes (optional, max 160)
            </label>
            <input
              id="task-notes"
              name="notes"
              type="text"
              maxLength={160}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-white/40 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white/15 px-4 py-2 text-white font-medium hover:bg-white/25 transition-colors disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add task"}
          </button>
        </form>
      )}
    </div>
  );
}
