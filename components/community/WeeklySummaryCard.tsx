"use client";

import { useState, useEffect } from "react";

interface WeeklySummaryCardProps {
  category: string;
  groupId: string;
}

export default function WeeklySummaryCard({ category, groupId }: WeeklySummaryCardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);
  const [weeklySummariesEnabled, setWeeklySummariesEnabled] = useState(true);

  useEffect(() => {
    // STEP 8: Kill switch is checked server-side in API routes

    // STEP 7: Check user preferences
    async function checkPreferences() {
      try {
        const res = await fetch("/api/community/intelligence-settings");
        const prefs = await res.json();
        setIntelligenceEnabled(prefs.enabled);
        setWeeklySummariesEnabled(prefs.weekly_summaries);
        return prefs;
      } catch (error) {
        console.error("Error fetching preferences:", error);
        return { enabled: true, weekly_summaries: true }; // Defaults
      }
    }

    async function fetchSummary() {
      try {
        const res = await fetch(`/api/community/summaries?category=${category}&group_id=${groupId}`);
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setLoading(false);
      }
    }

    async function init() {
      const prefs = await checkPreferences();
      if (prefs.enabled && prefs.weekly_summaries) {
        await fetchSummary();
      } else {
        setLoading(false);
      }
    }

    init();
  }, [category, groupId, intelligenceEnabled, weeklySummariesEnabled]);

  // STEP 8 & STEP 7: Kill switch and user preferences
  if (!intelligenceEnabled || !weeklySummariesEnabled) {
    return null;
  }

  if (loading) {
    return null;
  }

  // STEP 3: If no summary exists, render NOTHING (no empty state)
  if (!summary) {
    return null;
  }

  const weekStart = new Date(summary.week_start);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-white">This Week's Summary</h3>
          <p className="text-xs text-white/60 mt-0.5">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className="text-white/60 text-sm">
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-sm text-white/90 leading-relaxed">
            {summary.summary_text}
          </p>
          {summary.themes && summary.themes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.themes.map((theme: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
