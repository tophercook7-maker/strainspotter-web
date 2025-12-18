"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GardenEnvironmentPage() {
  const [gardenId, setGardenId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    temperature: "",
    humidity: "",
    vpd: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/garden/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.garden?.id) {
          setGardenId(data.garden.id);
          fetchLogs(data.garden.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
      });
  }, []);

  const fetchLogs = (id: string) => {
    fetch(`/api/garden/environment?garden_id=${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching logs:", err);
        setLoading(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId) return;

    try {
      const res = await fetch("/api/garden/environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garden_id: gardenId,
          temperature: formData.temperature || null,
          humidity: formData.humidity || null,
          vpd: formData.vpd || null,
          notes: formData.notes || null,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.log) {
        setLogs([data.log, ...logs]);
        setFormData({ temperature: "", humidity: "", vpd: "", notes: "" });
        setShowForm(false);
      }
    } catch (err) {
      console.error("Error adding log:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <p>Loading environment logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16 }}>
      <Link href="/garden/all" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Overview
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Environment</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold"
        >
          {showForm ? "Cancel" : "+ Log Environment"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-6">
          <input
            type="number"
            step="0.1"
            placeholder="Temperature (°F)"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Humidity (%)"
            value={formData.humidity}
            onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
          />
          <input
            type="number"
            step="0.1"
            placeholder="VPD (optional)"
            value={formData.vpd}
            onChange={(e) => setFormData({ ...formData, vpd: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
          />
          <textarea
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
            rows={3}
          />
          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 text-black rounded-lg font-semibold"
          >
            Log Environment
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No environment logs yet. Log your first reading.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">
                {new Date(log.logged_at).toLocaleString()}
              </div>
              <div className="space-y-1">
                {log.temperature && <div>Temperature: {log.temperature}°F</div>}
                {log.humidity && <div>Humidity: {log.humidity}%</div>}
                {log.vpd && <div>VPD: {log.vpd}</div>}
                {log.notes && <div className="text-gray-300 mt-2">{log.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
