"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GardenPlantsPage() {
  const [gardenId, setGardenId] = useState<string | null>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    strain_name: "",
    stage: "seedling",
    started_at: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    // Get garden ID from summary
    fetch("/api/garden/summary", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.garden?.id) {
          setGardenId(data.garden.id);
          fetchPlants(data.garden.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
      });
  }, []);

  const fetchPlants = (id: string) => {
    fetch(`/api/garden/plants?garden_id=${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setPlants(data.plants || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching plants:", err);
        setLoading(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId) return;

    try {
      const res = await fetch("/api/garden/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, garden_id: gardenId }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.plant) {
        setPlants([data.plant, ...plants]);
        setFormData({ strain_name: "", stage: "seedling", started_at: new Date().toISOString().split("T")[0], notes: "" });
        setShowForm(false);
      }
    } catch (err) {
      console.error("Error adding plant:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <p>Loading plants...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 16 }}>
      <Link href="/garden/all" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Overview
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Plants</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-black rounded-lg font-semibold"
        >
          {showForm ? "Cancel" : "+ Add Plant"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-6">
          <input
            type="text"
            placeholder="Strain name"
            value={formData.strain_name}
            onChange={(e) => setFormData({ ...formData, strain_name: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
            required
          />
          <select
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white mb-3"
          >
            <option value="seedling">Seedling</option>
            <option value="veg">Veg</option>
            <option value="flower">Flower</option>
            <option value="dry">Dry</option>
            <option value="cure">Cure</option>
            <option value="harvested">Harvested</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="date"
            value={formData.started_at}
            onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
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
            Add Plant
          </button>
        </form>
      )}

      {plants.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No plants yet. Add your first plant to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="bg-neutral-900 border border-neutral-700 rounded-lg p-4"
            >
              <div className="font-bold">{plant.strain_name}</div>
              <div className="text-sm text-gray-400 mt-1">
                Stage: {plant.stage} | Started: {plant.started_at}
              </div>
              {plant.notes && (
                <div className="text-sm mt-2 text-gray-300">{plant.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
