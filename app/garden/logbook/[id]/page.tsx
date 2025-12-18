"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StageChip } from "@/components/logbook/StageChip";
import ExportTimeline from "@/components/logbook/ExportTimeline";
import { LogTimeline } from "@/components/logbook/LogTimeline";
import { CoachPanel } from "@/components/logbook/CoachPanel";
import { calculateStreak } from "@/lib/logbook/streaks";
import { getPreviousGrow } from "@/lib/logbook/previousGrow";

function daysBetween(a: string, b: string = new Date().toISOString()): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function GrowDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const growId = params.id as string;
  
  // Initialize note state - will be set from prefill in useEffect
  const [note, setNote] = useState("");
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [stage, setStage] = useState("veg");
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [grow, setGrow] = useState<any>(null);
  const [allGrows, setAllGrows] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editNote, setEditNote] = useState("");
  const [editStage, setEditStage] = useState("veg");
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Fetch logs function
  const fetchLogs = async () => {
    if (!growId) return;
    
    setLoadingLogs(true);
    try {
      const response = await fetch(`/api/garden/logs?grow_id=${growId}`, {
        credentials: "include",
      });
      const text = await response.text();
      const json = text ? JSON.parse(text) : null;
      const logsArray = Array.isArray(json?.logs) ? json.logs : [];
      // API returns descending order, but ensure stable sort by id as tiebreaker
      logsArray.sort((a: any, b: any) => {
        const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (dateDiff !== 0) return dateDiff;
        // Tiebreaker: sort by id descending for stability
        return b.id.localeCompare(a.id);
      });
      setLogs(logsArray);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Prefill effect - runs when searchParams is available
  useEffect(() => {
    if (prefillApplied) return; // Already applied, don't run again
    
    const prefill = searchParams.get("prefill");
    if (prefill) {
      // Only set if note is currently empty
      setNote((currentNote) => {
        if (currentNote.trim() === "") {
          setPrefillApplied(true);
          return prefill;
        }
        return currentNote;
      });
    }
  }, [searchParams, prefillApplied]);

  useEffect(() => {
    // Fetch grow details
    fetch("/api/garden/grows", {
      credentials: "include",
    })
      .then(r => {
        const text = r.text();
        return text.then(t => t ? JSON.parse(t) : null);
      })
      .then(data => {
        const growsArray = Array.isArray(data) ? data : (data?.grows ? data.grows : []);
        setAllGrows(growsArray);
        const currentGrow = growsArray.find((g: any) => g.id === growId);
        setGrow(currentGrow);
      })
      .catch(err => console.error("Error fetching grow:", err));

    // Fetch logs for this grow
    fetchLogs();
  }, [growId, searchParams]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotoFiles(prev => [...prev, ...files]);
      
      // Create previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (logId: string, growId: string): Promise<string[]> => {
    if (photoFiles.length === 0) return [];

    setUploadingPhotos(true);
    setUploadProgress({});
    const uploadedPaths: string[] = [];

    try {
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = file.name.split('.').pop() || 'jpg';
        
        // Generate path: grows/{grow_id}/logs/{log_id}/{timestamp}-{random}.{ext}
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const path = `grows/${growId}/logs/${logId}/${timestamp}-${i}-${random}.${ext}`;

        // Get signed upload URL
        const urlRes = await fetch("/api/garden/logs/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ext, path }),
          credentials: "include",
        });

        if (!urlRes.ok) {
          console.error(`Failed to get upload URL for photo ${i + 1}`);
          continue;
        }

        const text = await urlRes.text();
        const json = text ? JSON.parse(text) : null;
        const { signedUrl } = json || {};

        if (!signedUrl) {
          console.error(`No signed URL for photo ${i + 1}`);
          continue;
        }

        // Upload file to signed URL
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) {
          console.error(`Failed to upload photo ${i + 1}`);
          continue;
        }

        uploadedPaths.push(path);
        setUploadProgress(prev => ({ ...prev, [i]: 100 }));
      }

      // Attach photos to log
      if (uploadedPaths.length > 0) {
        const attachRes = await fetch("/api/garden/log-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            log_id: logId,
            grow_id: growId,
            paths: uploadedPaths,
          }),
          credentials: "include",
        });

        if (!attachRes.ok) {
          console.error("Failed to attach photos to log");
        }
      }

      return uploadedPaths;
    } catch (err) {
      console.error("Error uploading photos:", err);
      return uploadedPaths;
    } finally {
      setUploadingPhotos(false);
      setUploadProgress({});
    }
  };

  const submit = async () => {
    if (!note.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Step 1: Create log entry first (even if photos fail)
      const res = await fetch("/api/garden/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grow_id: growId,
          note: note.trim(),
          stage,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        const errorData = text ? JSON.parse(text) : null;
        console.error("Failed to save log:", errorData);
        setSubmitting(false);
        return;
      }

      // Parse response to get the new log
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      const newLog = json?.log;

      if (!newLog) {
        setSubmitting(false);
        return;
      }

      // Step 2: Upload photos (non-blocking)
      if (photoFiles.length > 0) {
        uploadPhotos(newLog.id, growId).catch(err => {
          console.error("Photo upload failed (non-blocking):", err);
        });
      }

      // Step 3: Update state with new log (optimistic)
      setLogs(prev => {
        const updated = [newLog, ...prev];
        // Ensure stable sort by created_at DESC, then id DESC
        updated.sort((a: any, b: any) => {
          const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (dateDiff !== 0) return dateDiff;
          return b.id.localeCompare(a.id);
        });
        return updated;
      });

      // Clear form
      setNote("");
      setPhotoFiles([]);
      setPhotoPreviews([]);
      // Reset file input
      const fileInput = document.getElementById('photo-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      
      // Refetch logs after a short delay to get photos
      setTimeout(() => {
        fetchLogs().catch(console.error);
      }, 1000);
      
      setSubmitting(false);
    } catch (err) {
      console.error("Error submitting log:", err);
      setSubmitting(false);
    }
  };

      const handleEditLog = async () => {
        if (!editingLog || !editNote.trim()) return;

        setSubmitting(true);
        try {
          const res = await fetch(`/api/garden/logs/${editingLog.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              note: editNote.trim(),
              stage: editStage,
            }),
            credentials: "include",
          });

          if (!res.ok) {
            const text = await res.text();
            const errorData = text ? JSON.parse(text) : null;
            console.error("Failed to update log:", errorData);
            setSubmitting(false);
            return;
          }

          const text = await res.text();
          const json = text ? JSON.parse(text) : null;
          const updatedLog = json?.log;

          if (updatedLog) {
            // Update log in state (maintain position, just update fields)
            setLogs(prev => prev.map(log => 
              log.id === updatedLog.id ? updatedLog : log
            ));
          }

          // Close edit modal
          setEditingLog(null);
          setEditNote("");
          setEditStage("veg");
          setSubmitting(false);
        } catch (err) {
          console.error("Error updating log:", err);
          setSubmitting(false);
        }
      };

      const handleDeleteLog = async (logId: string) => {
        if (!confirm("Are you sure you want to delete this log entry? This cannot be undone.")) {
          return;
        }

        setDeletingLogId(logId);
        try {
          const res = await fetch(`/api/garden/logs/${logId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (!res.ok) {
            const text = await res.text();
            const errorData = text ? JSON.parse(text) : null;
            console.error("Failed to delete log:", errorData);
            setDeletingLogId(null);
            return;
          }

          // Remove log from state immediately (optimistic update)
          setLogs(prev => prev.filter(log => log.id !== logId));
          setDeletingLogId(null);
          
          // Optionally refetch to ensure consistency (but don't block UI)
          setTimeout(() => {
            fetchLogs().catch(console.error);
          }, 500);
        } catch (err) {
          console.error("Error deleting log:", err);
          setDeletingLogId(null);
        }
      };

  // Calculate analytics
  const daysSinceStart = grow ? daysBetween(grow.start_date) : 0;
  const totalLogs = logs.length;
  // Find when current stage started (first log entry with current stage, or grow start date)
  const currentStageLogs = logs.filter((log: any) => log.stage === (grow?.stage || "veg"));
  // Sort by date ascending to find the first entry in current stage
  const sortedStageLogs = [...currentStageLogs].sort((a: any, b: any) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const currentStageStart = sortedStageLogs.length > 0 
    ? sortedStageLogs[0].created_at 
    : grow?.start_date;
  const daysInCurrentStage = currentStageStart ? daysBetween(currentStageStart) : 0;
  
  // Calculate streak
  const streak = calculateStreak(logs);

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16, paddingBottom: 100 }}>
      <Link href="/garden/logbook" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Logbook
      </Link>

      {/* Basic Stats Strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #333", fontSize: 14 }}>
          Entries: {logs.length}
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #333", fontSize: 14 }}>
          Photos: {logs.filter(l => l.photo_url).length}
        </div>
      </div>

      {/* Streak Display */}
      {logs.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {streak > 0 ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "#1f4d3a",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              🔥 {streak}-day streak
            </div>
          ) : (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "#333",
                fontSize: 14,
                color: "#999",
              }}
            >
              Start a streak by logging today.
            </div>
          )}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              background: "#222",
              fontSize: 14,
            }}
          >
            Total logs: {logs.length}
          </div>
        </div>
      )}

      {/* Compare with Last Grow Button */}
      {grow && allGrows.length >= 2 && getPreviousGrow(grow, allGrows) && (
        <div style={{ marginBottom: 12 }}>
          <Link
            href={`/garden/logbook/compare?auto=last&id=${grow.id}`}
            style={{
              display: "inline-block",
            }}
          >
            <button 
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-700 transition"
            >
              🔁 Compare with last grow
            </button>
          </Link>
        </div>
      )}

      {/* Analytics Card */}
      {grow && (
        <div className="mb-6 p-4 bg-neutral-900 border border-neutral-700 rounded-xl">
          <h3 className="text-lg font-bold mb-3">📊 Grow Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Days since start:</span>
              <span className="font-semibold">{daysSinceStart}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Entries logged:</span>
              <span className="font-semibold">{totalLogs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current stage:</span>
              <div className="flex items-center gap-2">
                <StageChip stage={grow.stage} />
                <span className="font-semibold">{daysInCurrentStage} days</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coach Panel (read-only, loads after logs) */}
      {grow && !loadingLogs && (
        <CoachPanel growId={growId} hasLogs={logs.length > 0} />
      )}

      <h2 className="text-2xl font-bold mb-6">Log Today</h2>

      {/* Draft Helper */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/garden/coach/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grow_id: growId }),
                credentials: "include",
              });
              if (res.ok) {
                const text = await res.text();
                const json = text ? JSON.parse(text) : null;
                if (json?.suggestedNote) {
                  setNote(json.suggestedNote);
                }
              }
            } catch (err) {
              console.error("Failed to get draft:", err);
            }
          }}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid #34d399",
            color: "#34d399",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ✨ Draft my next log
        </button>
      </div>

      <textarea
        placeholder="Daily notes..."
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white mb-2"
        style={{ minHeight: 100 }}
      />
      <p className="text-xs text-gray-500 mb-4">
        Daily logs build streaks and improve Grow Coach guidance.
      </p>

      <select
        value={stage}
        onChange={e => setStage(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white mb-4"
      >
        <option value="seed">Seed</option>
        <option value="veg">Veg</option>
        <option value="flower">Flower</option>
        <option value="dry">Dry</option>
        <option value="cure">Cure</option>
      </select>

      {/* Photo Upload */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Photos (optional) - Select multiple
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white text-sm"
        />
        {photoPreviews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photoPreviews.map((preview, index) => (
              <div key={index} style={{ position: "relative" }}>
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-neutral-700"
                />
                <button
                  onClick={() => removePhoto(index)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
                {uploadProgress[index] !== undefined && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      right: 4,
                      height: 4,
                      background: "rgba(0, 0, 0, 0.5)",
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${uploadProgress[index]}%`,
                        background: "#34d399",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={submit}
        disabled={submitting || uploadingPhotos || !note.trim()}
        className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold disabled:opacity-50 mb-20"
      >
        {uploadingPhotos ? "Uploading photos..." : submitting ? "Saving..." : "Log Today"}
      </button>

      {/* Timeline */}
      <div className="mt-8 mb-20">
        <h3 className="text-xl font-bold mb-6">Timeline</h3>
        <LogTimeline
          logs={logs}
          grow={grow}
          loading={loadingLogs}
          onEdit={(log) => {
            setEditingLog(log);
            setEditNote(log.note);
            setEditStage(log.stage);
          }}
          onDelete={handleDeleteLog}
          deletingLogId={deletingLogId}
        />
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => {
            setEditingLog(null);
            setEditNote("");
            setEditStage("veg");
          }}
        >
          <div
            style={{
              background: "#111",
              borderRadius: 20,
              padding: 24,
              maxWidth: 500,
              width: "100%",
              border: "1px solid #333",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Edit Log Entry
            </h3>

            <textarea
              placeholder="Edit your notes..."
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white mb-4"
              style={{ minHeight: 120 }}
            />

            <select
              value={editStage}
              onChange={(e) => setEditStage(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white mb-4"
            >
              <option value="seed">Seed</option>
              <option value="veg">Veg</option>
              <option value="flower">Flower</option>
              <option value="dry">Dry</option>
              <option value="cure">Cure</option>
            </select>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleEditLog}
                disabled={submitting || !editNote.trim()}
                className="flex-1 py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setEditingLog(null);
                  setEditNote("");
                  setEditStage("veg");
                }}
                className="px-4 py-3 bg-neutral-800 border border-neutral-700 text-white rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Export */}
      {logs.length > 0 && (
        <div className="mt-8 mb-20">
          <ExportTimeline logs={logs} />
          {/* TODO: Push notification reminders */}
          {/* TODO: Weekly summary email */}
          {/* TODO: Streak milestones (7, 14, 30 days) */}
        </div>
      )}

      {/* Sticky "Log Today" Button (Mobile UX) */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 50,
        }}
      >
        <button
          onClick={() => {
            // Scroll to top of form
            window.scrollTo({ top: 0, behavior: "smooth" });
            // Focus textarea
            setTimeout(() => {
              const textarea = document.querySelector("textarea");
              if (textarea) textarea.focus();
            }, 300);
          }}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 16,
            fontWeight: 800,
            fontSize: 16,
            background: "#10b981",
            color: "#000",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}
        >
          ➕ Log Today
        </button>
      </div>
    </div>
  );
}
