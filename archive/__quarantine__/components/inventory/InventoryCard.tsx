"use client";

import { InventoryAdjustControls } from "@/components/dashboard/InventoryAdjustControls";

export default function InventoryCard({ item, refresh }: any) {
  const low = item.quantity <= item.low_stock_threshold;
  const expired =
    item.batch?.expires_on && new Date(item.batch.expires_on) < new Date();
  const expiringSoon =
    item.batch?.expires_on &&
    new Date(item.batch.expires_on).getTime() - Date.now() <
      1000 * 60 * 60 * 24 * 7;

  return (
    <div className="bg-black/40 border border-green-500/40 rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-lg text-green-200 font-semibold">{item.name}</h2>
        <span className="text-sm text-green-400">{item.strain_type}</span>
      </div>

      {/* Quantity */}
      <p className="mt-2 text-sm">
        Quantity:{" "}
        <span className="font-mono text-green-300">{item.quantity}</span>
      </p>

      {/* Batch */}
      {item.batch && (
        <>
          <p className="text-xs mt-1 text-green-400">
            Batch: {item.batch_id.slice(0, 8)}...
          </p>
          <p className="text-xs text-green-400">
            Remaining: {item.batch.remaining_units}
          </p>
        </>
      )}

      {/* Alerts */}
      {low && (
        <p className="text-yellow-400 text-xs mt-2">
          ⚠ Low stock — reorder or restock soon.
        </p>
      )}
      {expired && (
        <p className="text-red-500 text-xs">❌ This batch is expired.</p>
      )}
      {expiringSoon && (
        <p className="text-orange-300 text-xs">
          ⏳ Batch expires soon — within 7 days.
        </p>
      )}

      <div className="mt-3">
        <InventoryAdjustControls
          inventoryId={item.id}
          currentQuantity={item.quantity}
          onUpdated={refresh}
        />
      </div>
    </div>
  );
}
