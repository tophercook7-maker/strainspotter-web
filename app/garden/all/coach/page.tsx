"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GardenCoachPage() {
  const [gardenId, setGardenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [include, setInclude] = useState({
    summary: true,
    plants: true,
    tasks: true,
    environment: true,
    logbook: true,
  });

  useEffect(() => {
    fetch("/api/garden/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.garden?.id) {
          setGardenId(data.garden.id);
        }
      })
      .catch((err) => {
        console.error("Error:", err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/garden/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garden_id: gardenId,
          message: message.trim() || undefined,
          include,
        }),
        credentials: "include",
      });
      const text = await res.text();
      setResponse(text.trim() || "Coach unavailable right now.");
    } catch (err) {
      console.error("Error:", err);
      setResponse("Error getting coach response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <Link href="/garden/all" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Overview
      </Link>

      <h1 className="text-3xl font-bold mb-6">Garden Coach</h1>

      {/* Context toggles */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-4">
        <div className="text-sm font-semibold mb-2">Include in context:</div>
        <div className="space-y-2">
          {Object.entries(include).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setInclude({ ...include, [key]: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm capitalize">{key}</span>
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <textarea
          placeholder="Ask a question or leave blank for general insights..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white"
          rows={4}
        />
        <button
          type="submit"
          disabled={loading || !gardenId}
          className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Getting guidance..." : "Get Guidance"}
        </button>
      </form>

      {response && (
        <div className="bg-neutral-900 border border-emerald-700 rounded-lg p-4">
          <div className="text-sm font-semibold text-emerald-400 mb-2">Coach Response:</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{response}</div>
        </div>
      )}
    </div>
  );
}
