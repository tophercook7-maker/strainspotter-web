"use client";

import { useState } from "react";

interface Product {
  id: string;
  units_available: number | null;
  updated_at: string;
}

interface QuickActionsProps {
  product: Product;
  mutate: () => Promise<void>;
}

export default function QuickActions({ product, mutate }: QuickActionsProps) {
  const [loading, setLoading] = useState(false);

  async function adjustStock(amount: number) {
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/${product.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: amount }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to adjust stock"}`);
      } else {
        await mutate(); // refresh UI instantly
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      alert("Failed to adjust stock. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status: string) {
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/${product.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to update status"}`);
      } else {
        await mutate();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function duplicateProduct() {
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/${product.id}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to duplicate product"}`);
      } else {
        await mutate();
        alert("Product duplicated!");
      }
    } catch (error) {
      console.error("Error duplicating product:", error);
      alert("Failed to duplicate product. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-black/40 border border-green-500/40 rounded-xl p-4 mt-4 shadow-lg">
      <h2 className="text-green-400 text-xl font-bold mb-4">
        Quick Actions
      </h2>

      {/* STOCK ADJUSTMENT BUTTONS */}
      <div className="flex items-center gap-3">
        <button
          disabled={loading}
          onClick={() => adjustStock(-10)}
          className="px-4 py-2 bg-red-500/30 border border-red-400 rounded-lg hover:bg-red-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          -10
        </button>

        <button
          disabled={loading}
          onClick={() => adjustStock(-1)}
          className="px-4 py-2 bg-red-500/30 border border-red-400 rounded-lg hover:bg-red-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          -1
        </button>

        <span className="text-lg px-3 py-1 text-green-200">
          {product.units_available ?? 0} units
        </span>

        <button
          disabled={loading}
          onClick={() => adjustStock(1)}
          className="px-4 py-2 bg-green-600/40 border border-green-300 rounded-lg hover:bg-green-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +1
        </button>

        <button
          disabled={loading}
          onClick={() => adjustStock(10)}
          className="px-4 py-2 bg-green-600/40 border border-green-300 rounded-lg hover:bg-green-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +10
        </button>
      </div>

      {/* STATUS BUTTONS */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          disabled={loading}
          onClick={() => setStatus("active")}
          className="w-full py-3 rounded-lg bg-green-700/40 border border-green-400 hover:bg-green-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set Active
        </button>

        <button
          disabled={loading}
          onClick={() => setStatus("low")}
          className="w-full py-3 rounded-lg bg-yellow-600/40 border border-yellow-400 hover:bg-yellow-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mark Low Stock
        </button>

        <button
          disabled={loading}
          onClick={() => setStatus("sold_out")}
          className="w-full py-3 rounded-lg bg-red-600/40 border border-red-400 hover:bg-red-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mark Sold Out
        </button>

        <button
          disabled={loading}
          onClick={() => setStatus("archived")}
          className="w-full py-3 rounded-lg bg-gray-600/40 border border-gray-400 hover:bg-gray-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Archive
        </button>
      </div>

      {/* DUPLICATE PRODUCT */}
      <button
        disabled={loading}
        onClick={duplicateProduct}
        className="mt-4 w-full py-3 rounded-lg bg-blue-600/40 border border-blue-400 hover:bg-blue-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Duplicate Product
      </button>

      {/* TIMESTAMP */}
      <p className="text-sm text-green-300/70 mt-3">
        Last updated: {new Date(product.updated_at).toLocaleString()}
      </p>
    </div>
  );
}
