"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Grow {
  id: string;
  name: string;
  strain: string | null;
  stage: "seed" | "veg" | "flower" | "harvest";
  started_at: string;
  created_at: string;
}

export default function GrowLogbookPage() {
  const router = useRouter();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewGrowForm, setShowNewGrowForm] = useState(false);
  const [newGrowName, setNewGrowName] = useState("");
  const [newGrowStrain, setNewGrowStrain] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGrows();
  }, []);

  const fetchGrows = async () => {
    try {
      const response = await fetch("/api/garden/grows", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch grows");
      }
      const data = await response.json();
      setGrows(data.grows || []);
    } catch (err: any) {
      console.error("Error fetching grows:", err);
      setError(err.message || "Failed to load grows");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrowName.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/garden/grows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGrowName.trim(),
          strain: newGrowStrain.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create grow");
      }

      const data = await response.json();
      setShowNewGrowForm(false);
      setNewGrowName("");
      setNewGrowStrain("");
      router.push(`/garden/grow-log/${data.grow.id}`);
    } catch (err: any) {
      console.error("Error creating grow:", err);
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

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      seed: "Seed",
      veg: "Vegetative",
      flower: "Flowering",
      harvest: "Harvest",
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--botanical-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--botanical-text-secondary)]">Loading grows...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--botanical-bg-deep)] text-[var(--botanical-text-primary)] py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/garden"
            className="text-[var(--botanical-accent)] hover:text-[var(--botanical-accent-alt)] text-sm mb-4 inline-block"
          >
            ← Back to Garden
          </Link>
          <h1 className="text-3xl font-bold text-[var(--botanical-accent-alt)] mb-2">
            Grow Logbook
          </h1>
          <p className="text-[var(--botanical-text-secondary)]">
            Track every grow from seed to harvest.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* New Grow Form Modal */}
        {showNewGrowForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-[var(--botanical-accent-alt)] mb-4">
                Start a New Grow
              </h2>
              <form onSubmit={handleCreateGrow} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--botanical-text-primary)] mb-2">
                    Grow Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGrowName}
                    onChange={(e) => setNewGrowName(e.target.value)}
                    placeholder="e.g., Spring 2025 Grow"
                    required
                    className="w-full px-4 py-2 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] rounded-lg text-[var(--botanical-text-primary)] focus:outline-none focus:border-[var(--botanical-accent)]"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--botanical-text-primary)] mb-2">
                    Strain (optional)
                  </label>
                  <input
                    type="text"
                    value={newGrowStrain}
                    onChange={(e) => setNewGrowStrain(e.target.value)}
                    placeholder="e.g., Blue Dream"
                    className="w-full px-4 py-2 bg-[var(--botanical-bg-deep)] border border-[var(--botanical-border)] rounded-lg text-[var(--botanical-text-primary)] focus:outline-none focus:border-[var(--botanical-accent)]"
                    disabled={submitting}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !newGrowName.trim()}
                    className="flex-1 px-4 py-2 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Creating..." : "Create Grow"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewGrowForm(false);
                      setNewGrowName("");
                      setNewGrowStrain("");
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

        {/* Your Grows Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--botanical-text-primary)]">
              Your Grows
            </h2>
            <button
              onClick={() => setShowNewGrowForm(true)}
              className="px-4 py-2 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition text-sm"
            >
              + Start a New Grow
            </button>
          </div>

          {grows.length === 0 ? (
            <div className="bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--botanical-text-secondary)] mb-4">
                You haven't started any grows yet.
              </p>
              <button
                onClick={() => setShowNewGrowForm(true)}
                className="px-6 py-3 bg-[var(--botanical-accent)] text-black rounded-lg font-semibold hover:opacity-90 transition"
              >
                Start Your First Grow
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {grows.map((grow) => (
                <Link
                  key={grow.id}
                  href={`/garden/grow-log/${grow.id}`}
                  className="block bg-[var(--botanical-bg-surface)] border border-[var(--botanical-border)] rounded-lg p-5 hover:border-[var(--botanical-accent)]/40 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--botanical-text-primary)] mb-1">
                        {grow.name}
                      </h3>
                      {grow.strain && (
                        <p className="text-sm text-[var(--botanical-text-secondary)] mb-2">
                          {grow.strain}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[var(--botanical-text-secondary)]">
                        <span className="px-2 py-1 bg-[var(--botanical-bg-deep)] rounded border border-[var(--botanical-border)]">
                          {getStageLabel(grow.stage)}
                        </span>
                        <span>Started {formatDate(grow.started_at)}</span>
                      </div>
                    </div>
                    <span className="text-[var(--botanical-accent)] text-sm font-medium">
                      Open Log →
                    </span>
                  </div>
                </Link>
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
