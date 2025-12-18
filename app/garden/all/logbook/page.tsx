"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function GardenLogbookPage() {
  const searchParams = useSearchParams();
  const [gardenId, setGardenId] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    entry_type: "observation",
    text: "",
  });

  useEffect(() => {
    // Check for pre-filled text from URL
    const prefillText = searchParams.get("text");
    if (prefillText) {
      setFormData({
        entry_type: "observation",
        text: decodeURIComponent(prefillText),
      });
      setShowForm(true);
    }

    fetch("/api/garden/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.garden?.id) {
          setGardenId(data.garden.id);
          fetchEntries(data.garden.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
      });
  }, [searchParams]);

  const fetchEntries = (id: string) => {
    fetch(`/api/garden/logbook?garden_id=${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching entries:", err);
        setLoading(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId || !formData.text.trim()) return;

    try {
      const res = await fetch("/api/garden/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garden_id: gardenId,
          entry_type: formData.entry_type,
          text: formData.text.trim(),
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.entry) {
        setEntries([data.entry, ...entries]);
        setFormData({ entry_type: "observation", text: "" });
        setShowForm(false);
      }
    } catch (err) {
      console.error("Error adding entry:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <p>Loading logbook...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16 }}>
      <Link href="/garden/all" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Overview
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Logbook</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold"
        >
          {showForm ? "Cancel" : "+ Add Entry"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-6">
          <select
            value={formData.entry_type}
            onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
          >
            <option value="feeding">Feeding</option>
            <option value="watering">Watering</option>
            <option value="training">Training</option>
            <option value="observation">Observation</option>
            <option value="other">Other</option>
          </select>
          <textarea
            placeholder="Entry text"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
            rows={4}
            required
          />
          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold"
          >
            Add Entry
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-8 text-center">
          <p className="text-gray-300 mb-2">No logbook entries yet.</p>
          <p className="text-gray-500 text-sm mb-4">Start logging your grow activities, observations, and notes.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Create your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-semibold text-emerald-400">{entry.entry_type}</div>
                <div className="text-sm text-gray-400">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm">{entry.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
