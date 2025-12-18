"use client";

import { useState, useEffect } from "react";

interface CoachPanelProps {
  growId: string;
  hasLogs: boolean;
}

export function CoachPanel({ growId, hasLogs }: CoachPanelProps) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/garden/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grow_id: growId }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        // Try to extract a useful error message, but fall back gracefully
        let message = "Failed to fetch insights";
        try {
          const errorData = text ? JSON.parse(text) : null;
          if (errorData?.details) message = errorData.details;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const text = await res.text();
      const trimmed = text.trim();
      if (!trimmed) {
        setError("empty");
        setText(null);
      } else {
        setText(trimmed);
      }
    } catch (err: any) {
      setError(err.message);
      setText(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load coach after logs have loaded and at least one log exists
    if (growId && hasLogs) {
      fetchInsights();
    }
  }, [growId, hasLogs]);

  // Friendly empty state when there are no logs yet
  if (!hasLogs) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px dashed #333",
          background: "#111",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 8,
            color: "#9ca3af",
          }}
        >
          🧠 Grow Coach
        </div>
        <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
          Once you’ve logged a few entries, Grow Coach will share gentle observations
          and suggestions based on your timeline.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: 20,
        borderRadius: 16,
        border: "1px solid #333",
        background: "#111",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#34d399" }}>
          🧠 Grow Coach
        </div>
        <div style={{ opacity: 0.7 }}>Analyzing your grow...</div>
      </div>
    );
  }

  if (error || !text) {
    return (
      <div style={{
        padding: 20,
        borderRadius: 16,
        border: "1px solid #333",
        background: "#111",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#9ca3af" }}>
          🧠 Grow Coach
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
          Coach unavailable right now.
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      border: "1px solid #34d399",
      background: "linear-gradient(135deg, #0a1a0a 0%, #111 100%)",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#34d399" }}>
          🧠 Grow Coach
        </div>
        <button
          onClick={fetchInsights}
          style={{
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid #34d399",
            color: "#34d399",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Render plain text from AI (already structured into sections) */}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
          opacity: 0.95,
        }}
      >
        {text}
      </div>
    </div>
  );
}
