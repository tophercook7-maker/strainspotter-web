"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GardenAllPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/garden/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching summary:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <p>Loading garden overview...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <p>Failed to load garden data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16 }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Garden
      </Link>

      <h1 className="text-3xl font-bold mb-6">{summary.garden?.name || "My Garden"}</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Plants</div>
          <div className="text-2xl font-bold">{summary.plants_count || 0}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Open Tasks</div>
          <div className="text-2xl font-bold">{summary.open_tasks_count || 0}</div>
        </div>
      </div>

      {/* Latest Environment */}
      {summary.last_environment && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-4">
          <h3 className="font-bold mb-2">Latest Environment</h3>
          <div className="text-sm space-y-1">
            {summary.last_environment.temperature && (
              <div>Temperature: {summary.last_environment.temperature}°F</div>
            )}
            {summary.last_environment.humidity && (
              <div>Humidity: {summary.last_environment.humidity}%</div>
            )}
            {summary.last_environment.notes && (
              <div className="text-gray-400">{summary.last_environment.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Latest Logbook Entry */}
      {summary.last_logbook_entry && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-4">
          <h3 className="font-bold mb-2">Latest Logbook Entry</h3>
          <div className="text-sm">
            <div className="text-gray-400 mb-1">{summary.last_logbook_entry.entry_type}</div>
            <div>{summary.last_logbook_entry.text}</div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="space-y-2 mt-6">
        <Link
          href="/garden/all/plants"
          className="block bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800"
        >
          <div className="font-bold">Plants</div>
          <div className="text-sm text-gray-400">Manage your plants</div>
        </Link>
        <Link
          href="/garden/all/tasks"
          className="block bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800"
        >
          <div className="font-bold">Tasks</div>
          <div className="text-sm text-gray-400">Track your to-dos</div>
        </Link>
        <Link
          href="/garden/all/environment"
          className="block bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800"
        >
          <div className="font-bold">Environment</div>
          <div className="text-sm text-gray-400">Log temperature, humidity, VPD</div>
        </Link>
        <Link
          href="/garden/all/logbook"
          className="block bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800"
        >
          <div className="font-bold">Logbook</div>
          <div className="text-sm text-gray-400">Document observations</div>
        </Link>
        <Link
          href="/garden/all/coach"
          className="block bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800"
        >
          <div className="font-bold">Garden Coach</div>
          <div className="text-sm text-gray-400">Get AI guidance</div>
        </Link>
      </div>
    </div>
  );
}
