"use client";
import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateStreak } from "@/lib/logbook/streaks";
import { setupAndroidBackHandler } from "@/lib/navigation/androidBack";

function GrowCoachContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stage, setStage] = useState("veg");
  const [note, setNote] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupAndroidBackHandler(router, '/garden');
    return cleanup;
  }, [router]);

  // Prefill from query params (if coming from log entry) - memoized to prevent re-fetching
  const growId = useMemo(() => searchParams.get("grow_id"), [searchParams]);
  
  useEffect(() => {
    const stageParam = searchParams.get("stage");
    const noteParam = searchParams.get("note");
    if (stageParam) setStage(stageParam);
    if (noteParam) setNote(decodeURIComponent(noteParam));
    
    // Calculate streak if grow_id is provided
    if (growId) {
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      fetch(`/api/garden/logs?grow_id=${growId}`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then(r => {
          clearTimeout(timeoutId);
          return r.json();
        })
        .then(data => {
          const logsArray = Array.isArray(data) ? data : [];
          setStreak(calculateStreak(logsArray));
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          if (err.name !== 'AbortError') {
            console.warn('Failed to fetch streak:', err);
          }
          setStreak(null);
        });
      
      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    }
  }, [growId, searchParams]);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const growId = searchParams.get("grow_id");

      // If we don't know which grow to read, don't call the API
      if (!growId) {
        setOut(
          "Grow Coach needs a specific grow to read.\n\n" +
          "Open this from a Grow Logbook entry so it can review that grow's timeline."
        );
        return;
      }

      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const r = await fetch("/api/garden/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grow_id: growId }),
          credentials: "include",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!r.ok) {
          throw new Error(`Request failed with status ${r.status}`);
        }
        
        const text = await r.text();
        const trimmed = text.trim();
        setOut(trimmed || null);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          setOut("Request timed out. Please try again.");
        } else {
          console.error("Error getting coach guidance:", err);
          setOut("Unable to get guidance right now. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error getting coach guidance:", err);
      setLoading(false);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Garden
      </Link>

      <h1 className="text-3xl font-bold mb-2">Grow Coach</h1>
      <p className="opacity-85 mb-6">
        Quick guidance based on your grow's timeline. (Read-only, log-based)
      </p>

      <div className="space-y-4">
        <select
          value={stage}
          onChange={e => setStage(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
        >
          <option value="seed">Seed</option>
          <option value="veg">Veg</option>
          <option value="flower">Flower</option>
          <option value="dry">Dry</option>
          <option value="cure">Cure</option>
        </select>

        <textarea
          placeholder="What are you seeing today? (yellowing, droop, spots, pests, etc.)"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          style={{ minHeight: 110 }}
        />

        <button
          onClick={run}
          disabled={loading}
          className="w-full py-3 px-4 bg-emerald-600 text-black rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "Getting Guidance..." : "Get Guidance"}
        </button>

        {out && (
          <div className="border border-neutral-700 rounded-xl p-4 bg-neutral-900 whitespace-pre-wrap text-sm leading-relaxed opacity-95">
            {out}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GrowCoachPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <GrowCoachContent />
    </Suspense>
  );
}
