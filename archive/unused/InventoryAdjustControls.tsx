"use client";

import { useState } from "react";

type Props = {
  inventoryId: string;
  currentQuantity: number;
  onUpdated?: (newQuantity: number) => void;
};

export function InventoryAdjustControls({
  inventoryId,
  currentQuantity,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(currentQuantity);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");

  async function applyChange() {
    if (!delta) return;

    setLoading(true);

    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: inventoryId,
          delta,
          reason,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        alert(data.error || "Failed to adjust inventory");
        return;
      }

      setQty(data.newQuantity);
      setDelta(0);
      setReason("");
      if (onUpdated) onUpdated(data.newQuantity);
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      alert("Failed to adjust inventory. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-black/40 border border-green-500/40 rounded-xl p-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-green-200">Current:</span>
        <span className="font-mono text-green-300">{qty}</span>
      </div>

      <input
        type="number"
        className="bg-black/60 border border-green-500/50 rounded px-2 py-1 text-sm text-white placeholder:text-gray-400"
        placeholder="Δ (e.g. -5 for sale)"
        value={delta || ""}
        onChange={(e) => setDelta(Number(e.target.value))}
      />

      <input
        className="bg-black/60 border border-green-500/30 rounded px-2 py-1 text-xs text-white placeholder:text-gray-400"
        placeholder="Reason (sale, waste, transfer)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <button
        onClick={applyChange}
        disabled={loading || !delta}
        className="text-xs bg-emerald-600/60 hover:bg-emerald-500/80 border border-emerald-300/60 rounded py-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Applying..." : "Apply Change"}
      </button>
    </div>
  );
}
