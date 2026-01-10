"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MissedItem {
  type: "pinned_post" | "helpful_reply" | "weekly_summary";
  group_category: string;
  group_id: string;
  title?: string;
  count?: number;
  week_start?: string;
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

export default function WhatYouMissed() {
  const [items, setItems] = useState<MissedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(true);
  const [whatYouMissedEnabled, setWhatYouMissedEnabled] = useState(true);

  useEffect(() => {
    // STEP 8: Kill switch is checked server-side in API routes

    // STEP 7: Check user preferences
    async function checkPreferences() {
      try {
        const res = await fetch("/api/community/intelligence-settings");
        const prefs = await res.json();
        setIntelligenceEnabled(prefs.enabled);
        setWhatYouMissedEnabled(prefs.what_you_missed);
        return prefs;
      } catch (error) {
        console.error("Error fetching preferences:", error);
        return { enabled: true, what_you_missed: true }; // Defaults
      }
    }

    async function fetchMissed() {
      try {
        const res = await fetch("/api/community/what-you-missed");
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      } catch (error) {
        console.error("Error fetching what you missed:", error);
      } finally {
        setLoading(false);
      }
    }

    async function init() {
      const prefs = await checkPreferences();
      if (prefs.enabled && prefs.what_you_missed) {
        await fetchMissed();
      }
    }

    init();
  }, [intelligenceEnabled, whatYouMissedEnabled]);

  // STEP 8 & STEP 7: Kill switch and user preferences
  if (!intelligenceEnabled || !whatYouMissedEnabled) {
    return null;
  }

  if (loading || items.length === 0) {
    return null;
  }

  const getItemLabel = (item: MissedItem) => {
    const groupName = groupNames[item.group_category]?.[item.group_id] || item.group_id;
    
    switch (item.type) {
      case "pinned_post":
        return `New pinned post${item.count && item.count > 1 ? `s` : ''} in ${groupName}`;
      case "helpful_reply":
        return `${item.count} helpful ${item.count === 1 ? 'reply' : 'replies'} in ${groupName}`;
      case "weekly_summary":
        return `New weekly summary in ${groupName}`;
      default:
        return `New activity in ${groupName}`;
    }
  };

  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20">
      <h3 className="text-sm font-semibold text-white mb-3">What You Missed</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <Link
            key={idx}
            href={`/community/groups/${item.group_category}/${item.group_id}`}
            className="block text-sm text-white/80 hover:text-white transition"
          >
            {getItemLabel(item)}
          </Link>
        ))}
      </div>
    </div>
  );
}
