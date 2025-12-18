"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Grow {
  id: string;
  name: string;
  strain: string | null;
  stage: "seed" | "veg" | "flower" | "harvest";
  started_at: string;
  created_at: string;
}

interface GrowLog {
  id: string;
  entry_date: string;
  notes: string;
  photo_url: string | null;
  created_at: string;
}

export default function GrowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const growId = params.id as string;

  const [grow, setGrow] = useState<Grow | null>(null);
  const [logs, setLogs] = useState<GrowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [newLogNotes, setNewLogNotes] = useState("");
  const [newLogPhotoUrl, setNewLogPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    if (growId) {
      fetchGrow();
      fetchLogs();
    }
  }, [growId]);

  const fetchGrow = async () => {
    try {
      const response = await fetch(`/api/garden/grows/${growId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch grow");
      }
      const data = await response.json();
      setGrow(data.grow);
    } catch (err: any) {
      console.error("Error fetching grow:", err);
      setError(err.message || "Failed to load grow");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/garden/grows/${growId}/logs`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
    }
  };

  const handleUpdateStage = async (newStage: string) => {
    if (!grow) return;

    setUpdatingStage(true);
    try {
      const response = await fetch(`/api/garden/grows/${growId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to update stage");
      }

      const data = await response.json();
      setGrow(data.grow);
    } catch (err: any) {
      console.error("Error updating stage:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNotes.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/garden/grows/${growId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: newLogNotes.trim(),
          photo_url: newLogPhotoUrl.trim() || null,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create log entry");
      }

      setShowLogForm(false);
      setNewLogNotes("");
      setNewLogPhotoUrl("");
      fetchLogs();
    } catch (err: any) {
      console.error("Error creating log:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--botanical-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--botanical-text-secondary)]">Loading grow...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !grow) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-6">
            <p className="text-red-200 mb-4">{error || "Grow not found"}</p>
            <Link
              href="/garden/grow-log"
              className="inline-block px-4 py-2 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition"
            >
              ← Back to Logbook
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/garden/grow-log"
            className="text-[var(--botanical-accent)] hover:text-[var(--botanical-accent-alt)] text-sm mb-4 inline-block"
          >
            ← Back to Logbook
          </Link>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--botanical-accent-alt)] mb-1">
                {grow.name}
              </h1>
              {grow.strain && (
                <p className="text-lg text-[var(--botanical-text-secondary)]">
                  {grow.strain}
                </p>
              )}
            </div>
          </div>

          {/* Stage Selector */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-[var(--botanical-text-primary)]">
              Stage:
            </label>
            <select
              value={grow.stage}
              onChange={(e) => handleUpdateStage(e.target.value)}
              disabled={updatingStage}
              className="px-3 py-1.5 bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg text-[var(--botanical-text-primary)] focus:outline-none focus:border-[var(--botanical-accent)] disabled:opacity-50"
            >
              <option value="seed">Seed</option>
              <option value="veg">Vegetative</option>
              <option value="flower">Flowering</option>
              <option value="harvest">Harvest</option>
            </select>
            <span className="text-xs text-[var(--botanical-text-secondary)]">
              Started {formatDate(grow.started_at)}
            </span>
          </div>
        </div>

        {/* Add Log Entry Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowLogForm(true)}
            className="px-4 py-2 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition"
          >
            + Add Log Entry
          </button>
        </div>

        {/* Log Entry Form Modal */}
        {showLogForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-[var(--botanical-accent-alt)] mb-4">
                Add Log Entry
              </h2>
              <form onSubmit={handleAddLog} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--botanical-text-primary)] mb-2">
                    Notes <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={newLogNotes}
                    onChange={(e) => setNewLogNotes(e.target.value)}
                    placeholder="What's happening with your grow today?"
                    required
                    rows={6}
                    className="w-full px-4 py-2 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] rounded-lg text-[var(--botanical-text-primary)] focus:outline-none focus:border-[var(--botanical-accent)] resize-none"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--botanical-text-primary)] mb-2">
                    Photo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newLogPhotoUrl}
                    onChange={(e) => setNewLogPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] rounded-lg text-[var(--botanical-text-primary)] focus:outline-none focus:border-[var(--botanical-accent)]"
                    disabled={submitting}
                  />
                  <p className="text-xs text-[var(--botanical-text-secondary)] mt-1">
                    Photo upload coming soon. For now, paste an image URL.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !newLogNotes.trim()}
                    className="flex-1 px-4 py-2 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Saving..." : "Save Entry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogForm(false);
                      setNewLogNotes("");
                      setNewLogPhotoUrl("");
                    }}
                    disabled={submitting}
                    className="px-4 py-2 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] text-[var(--botanical-text-primary)] rounded-lg hover:border-[var(--botanical-accent)]/40 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Timeline */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--botanical-text-primary)] mb-4">
            Grow Timeline
          </h2>

          {logs.length === 0 ? (
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--botanical-text-secondary)] mb-4">
                No log entries yet. Start tracking your grow's progress!
              </p>
              <button
                onClick={() => setShowLogForm(true)}
                className="px-6 py-3 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition"
              >
                Add First Entry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[var(--botanical-accent)] mt-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--botanical-accent-alt)]">
                          {formatDate(log.entry_date)}
                        </span>
                        <span className="text-xs text-[var(--botanical-text-secondary)]">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      <p className="text-[var(--botanical-text-primary)] whitespace-pre-wrap mb-3">
                        {log.notes}
                      </p>
                      {log.photo_url && (
                        <div className="mt-3">
                          <img
                            src={log.photo_url}
                            alt="Grow log photo"
                            className="max-w-full h-auto rounded-lg border border-[var(--botanical-border)]"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* TODO: Future features */}
        {/* 
          TODO: AI summary of grow progress
          TODO: Issue detection (yellowing, pests)
          TODO: Photo comparison
          TODO: Sharing to community
        */}
      </div>
    </div>
  );
}
