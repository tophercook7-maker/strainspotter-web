"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { setupAndroidBackHandler } from "@/lib/navigation/androidBack";

interface GrowNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  related_plant_id?: string | null;
  source: string;
}

interface AISuggestion {
  type: string;
  title: string;
  description: string;
  action?: string;
  related_notes?: Array<{
    id: string;
    preview: string;
    created_at: string;
  }>;
}

export default function GrowNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<GrowNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, AISuggestion[]>>({});
  const [visibleSuggestions, setVisibleSuggestions] = useState<Record<string, boolean>>({});
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupAndroidBackHandler(router, '/garden');
    return cleanup;
  }, [router]);

  // Check feature flag on mount (memoized to prevent re-checking)
  useEffect(() => {
    let mounted = true;
    
    async function checkFeature() {
      const enabled = await isFeatureEnabled('enable_grow_notes', false);
      if (mounted) {
        setFeatureEnabled(enabled);
        
        if (!enabled) {
          // Feature disabled - redirect to garden
          router.push('/garden');
          return;
        }
      }
    }
    checkFeature();
    
    return () => {
      mounted = false;
    };
  }, [router]);

  // Fetch notes if feature is enabled
  useEffect(() => {
    if (featureEnabled !== true) return;

    async function fetchNotes() {
      try {
        // Add timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch("/api/garden/notes", {
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error("Failed to fetch notes");
          }
          
          const data = await response.json();
          setNotes(data.notes || []);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.warn("Notes fetch timeout");
            setNotes([]); // Fail gracefully
          } else {
            throw fetchError;
          }
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
        // Fail gracefully - show empty state
        setNotes([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, [featureEnabled]);

  // Don't render if feature is disabled or still checking
  if (featureEnabled === false || featureEnabled === null) {
    return (
      <div className="p-6">
        <p className="text-white/70">Loading...</p>
      </div>
    );
  }

  const handleSave = useCallback(async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch("/api/garden/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNote }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Failed to save note");
        }

        const data = await response.json();
        setNotes([data.note, ...notes]);
        setNewNote("");

        // Fetch suggestions for new note
        if (data.note?.id) {
          fetchSuggestions(data.note.id);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          alert("Request timed out. Please try again.");
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [newNote, notes]);

  async function fetchSuggestions(noteId: string) {
    try {
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`/api/garden/notes/${noteId}/suggestions`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return;

        const data = await response.json();
        setSuggestions((prev) => ({
          ...prev,
          [noteId]: data.suggestions || [],
        }));
        setVisibleSuggestions((prev) => ({
          ...prev,
          [noteId]: true,
        }));
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn("Suggestions fetch timeout");
          // Fail silently - suggestions are optional
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      // Fail silently - suggestions are optional
    }
  }

  const handleDelete = useCallback(async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      const response = await fetch(`/api/garden/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      setNotes(notes.filter((n) => n.id !== noteId));
      setSuggestions((prev) => {
        const updated = { ...prev };
        delete updated[noteId];
        return updated;
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    }
  }, [notes]);

  const handleConvert = useCallback((noteId: string, action: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    if (action === "convert_task") {
      const encoded = encodeURIComponent(note.content);
      router.push(`/garden/all/tasks?prefill=${encoded}`);
    } else if (action === "convert_logbook") {
      const encoded = encodeURIComponent(note.content);
      router.push(`/garden/logbook?prefill=${encoded}`);
    }
  }, [notes, router]);

  const handleDismissSuggestion = useCallback((noteId: string) => {
    setVisibleSuggestions((prev) => ({
      ...prev,
      [noteId]: false,
    }));
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-white/70">Loading notes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-8 safe-area-bottom overflow-x-hidden">
      {/* Back to Garden */}
      <Link
        href="/garden"
        className="inline-flex items-center text-sm text-white/70 hover:text-white transition"
      >
        ← Back to Garden
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Grow Notes
        </h1>
        <p className="text-sm text-white/70 mt-1">
          AI-assisted thinking layer for your grow
        </p>
      </div>

      {/* Add Note Form */}
      <div className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about your grow..."
          className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-white/50 focus:outline-none focus:border-white/20 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={!newNote.trim() || saving}
          className="mt-4 px-6 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Saving..." : "Save Note"}
        </button>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-white/50 text-center py-12">
            No notes yet. Add your first note above.
          </p>
        ) : (
          notes.map((note) => {
            const noteSuggestions = suggestions[note.id] || [];
            const showSuggestions = visibleSuggestions[note.id] && noteSuggestions.length > 0;

            return (
              <div
                key={note.id}
                className="rounded-xl backdrop-blur-md bg-white/10 border border-white/10 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-white whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-white/50 mt-2">
                      {formatDate(note.created_at)}
                      {note.source !== "manual" && ` • From ${note.source}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="ml-4 text-white/50 hover:text-red-400 transition text-sm"
                  >
                    Delete
                  </button>
                </div>

                {/* AI Suggestions */}
                {showSuggestions && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    <p className="text-xs text-white/60 mb-2">💡 Suggestions:</p>
                    {noteSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-emerald-300">
                              {suggestion.title}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              {suggestion.description}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDismissSuggestion(note.id)}
                            className="text-xs text-white/50 hover:text-white/70"
                          >
                            ✕
                          </button>
                        </div>
                        {suggestion.action && (
                          <button
                            onClick={() => handleConvert(note.id, suggestion.action!)}
                            className="text-xs px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded hover:bg-emerald-600/30 transition"
                          >
                            {suggestion.action === "convert_task"
                              ? "Convert to Task"
                              : "Convert to Logbook"}
                          </button>
                        )}
                        {suggestion.related_notes &&
                          suggestion.related_notes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-white/60">
                                Related notes:
                              </p>
                              {suggestion.related_notes.map((related, ridx) => (
                                <div
                                  key={ridx}
                                  className="text-xs text-white/70 bg-white/5 p-2 rounded"
                                >
                                  {related.preview}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Load Suggestions Button */}
                {!showSuggestions && (
                  <button
                    onClick={() => fetchSuggestions(note.id)}
                    className="mt-2 text-xs text-white/60 hover:text-white/80 transition"
                  >
                    Get AI suggestions →
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
