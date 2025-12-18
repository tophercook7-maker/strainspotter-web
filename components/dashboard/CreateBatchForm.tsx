"use client";

import { useState } from "react";

interface CreateBatchFormProps {
  mutate: () => Promise<void>;
}

export default function CreateBatchForm({ mutate }: CreateBatchFormProps) {
  const [form, setForm] = useState({
    strain: "",
    batch_code: "",
    harvested_at: "",
    cured_at: "",
    total_units: 0,
    thc: "",
    cbd: "",
    notes: ""
  });

  const [loading, setLoading] = useState(false);

  async function submitBatch() {
    if (!form.strain) {
      alert("Strain is required");
      return;
    }

    setLoading(true);

    try {
      // Auto-generate batch code if empty
      const batchData = {
        ...form,
        batch_code: form.batch_code || `BATCH-${Date.now()}`,
        total_units: form.total_units || 0,
        thc: form.thc ? parseFloat(form.thc) : null,
        cbd: form.cbd ? parseFloat(form.cbd) : null,
        harvested_at: form.harvested_at || null,
        cured_at: form.cured_at || null,
      };

      const res = await fetch("/api/batches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData)
      });

      const data = await res.json();

      if (res.ok) {
        // Reset form
        setForm({
          strain: "",
          batch_code: "",
          harvested_at: "",
          cured_at: "",
          total_units: 0,
          thc: "",
          cbd: "",
          notes: ""
        });
        
        await mutate(); // refresh UI
        alert("Batch created!");
      } else {
        alert(`Error: ${data.error || "Failed to create batch"}`);
      }
    } catch (error) {
      console.error("Error creating batch:", error);
      alert("Failed to create batch. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-black/40 border border-green-400/40 p-6 rounded-xl">
      <h2 className="text-green-300 text-xl font-bold mb-4">Create New Batch</h2>

      <div className="flex flex-col gap-3">
        <input
          className="bg-black/60 border border-green-300 p-2 rounded text-white placeholder:text-gray-400"
          placeholder="Strain"
          value={form.strain}
          onChange={(e) => setForm({ ...form, strain: e.target.value })}
          required
        />

        <input
          className="bg-black/60 border border-green-300 p-2 rounded text-white placeholder:text-gray-400"
          placeholder="Batch Code (auto-generate if empty)"
          value={form.batch_code}
          onChange={(e) => setForm({ ...form, batch_code: e.target.value })}
        />

        <label className="text-green-200">Harvest Date</label>
        <input
          type="date"
          className="bg-black/60 border border-green-300 p-2 rounded text-white"
          value={form.harvested_at}
          onChange={(e) => setForm({ ...form, harvested_at: e.target.value })}
        />

        <label className="text-green-200">Cure Complete</label>
        <input
          type="date"
          className="bg-black/60 border border-green-300 p-2 rounded text-white"
          value={form.cured_at}
          onChange={(e) => setForm({ ...form, cured_at: e.target.value })}
        />

        <input
          type="number"
          className="bg-black/60 border border-green-300 p-2 rounded text-white placeholder:text-gray-400"
          placeholder="Total Units"
          value={form.total_units || ""}
          onChange={(e) =>
            setForm({ ...form, total_units: Number(e.target.value) || 0 })
          }
        />

        <input
          type="number"
          step="0.1"
          className="bg-black/60 border border-green-300 p-2 rounded text-white placeholder:text-gray-400"
          placeholder="THC %"
          value={form.thc}
          onChange={(e) => setForm({ ...form, thc: e.target.value })}
        />

        <input
          type="number"
          step="0.1"
          className="bg-black/60 border border-green-300 p-2 rounded text-white placeholder:text-gray-400"
          placeholder="CBD %"
          value={form.cbd}
          onChange={(e) => setForm({ ...form, cbd: e.target.value })}
        />

        <textarea
          className="bg-black/60 border border-green-300 p-2 rounded min-h-[100px] text-white placeholder:text-gray-400"
          placeholder="Notes about this batch"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <button
          onClick={submitBatch}
          disabled={loading || !form.strain}
          className="mt-4 bg-green-600/40 border border-green-300 py-2 rounded-xl hover:bg-green-600/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Batch"}
        </button>
      </div>
    </div>
  );
}
