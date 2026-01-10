"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Summary {
  id: string;
  category: string;
  group_id: string;
  summary_text: string;
  themes: string[];
  week_start: string;
}

const groupNames: Record<string, Record<string, string>> = {
  growers: {
    beginners: "Beginner Growers",
    intermediate: "Intermediate Growers",
    advanced: "Advanced Growers",
    commercial: "Commercial Growers",
  },
  strains: {
    indica: "Indica Lovers",
    sativa: "Sativa Enthusiasts",
    hybrid: "Hybrid Growers",
    landrace: "Landrace Genetics",
  },
  regional: {
    "north-america": "North America",
    europe: "Europe",
    asia: "Asia Pacific",
    other: "Other Regions",
  },
  official: {
    announcements: "Announcements",
    support: "Community Support",
    "feature-requests": "Feature Requests",
  },
};

export default function CommunityInsights() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);

  useEffect(() => {
    // STEP 8: Kill switch is checked server-side in API routes

    // STEP 7: Check user preferences
    async function checkPreferences() {
      try {
        const res = await fetch("/api/community/intelligence-settings");
        const prefs = await res.json();
        setIntelligenceEnabled(prefs.enabled);
        return prefs;
      } catch (error) {
        console.error("Error fetching preferences:", error);
        return { enabled: true }; // Default
      }
    }

    async function fetchSummaries() {
      try {
        const res = await fetch("/api/community/summaries/list");
        const data = await res.json();
        if (data.summaries) {
          setSummaries(data.summaries.slice(0, 3)); // Max 3
        }
      } catch (error) {
        console.error("Error fetching summaries:", error);
      } finally {
        setLoading(false);
      }
    }

    async function init() {
      const prefs = await checkPreferences();
      if (prefs.enabled) {
        await fetchSummaries();
      }
    }

    init();
  }, [intelligenceEnabled]);

  // STEP 8 & STEP 7: Kill switch and user preferences
  if (!intelligenceEnabled) {
    return null;
  }

  if (loading || summaries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20">
      <h3 className="text-sm font-semibold text-white mb-3">Community Insights</h3>
      <div className="space-y-2">
        {summaries.map((summary) => {
          const groupName = groupNames[summary.category]?.[summary.group_id] || summary.group_id;
          // Extract first sentence or first 60 chars
          const snippet = summary.summary_text.split('.')[0].slice(0, 60) + '...';
          
          return (
            <Link
              key={summary.id}
              href={`/community/groups/${summary.category}/${summary.group_id}`}
              className="block text-sm text-white/80 hover:text-white transition"
            >
              <span className="font-medium text-white/90">{groupName}:</span> {snippet}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
