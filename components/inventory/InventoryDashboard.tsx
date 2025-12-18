"use client";

import { useState, useEffect } from "react";
import InventoryCard from "./InventoryCard";

export default function InventoryDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadInventory() {
    setLoading(true);
    const res = await fetch("/api/inventory/list");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-green-300 mb-6 tracking-wide">
        Inventory Dashboard
      </h1>

      {loading ? (
        <div className="text-center text-green-300 py-8">
          Loading inventory...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-black/40 border border-green-400/40 rounded-xl p-8 text-center">
          <p className="text-green-300 mb-2">No inventory items yet.</p>
          <p className="text-gray-400 text-sm mb-4">Start tracking your inventory to manage your grow operation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item: any) => (
            <InventoryCard key={item.id} item={item} refresh={loadInventory} />
          ))}
        </div>
      )}
    </div>
  );
}
