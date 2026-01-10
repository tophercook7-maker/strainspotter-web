// /grower-dashboard/inventory/upload/page.tsx

"use client";

import { useState } from "react";
import GrowerDashboardLayout from "@/components/dashboard/GrowerDashboardLayout";

export default function InventoryUploadPage() {
  const [file, setFile] = useState<File | null>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setFile(e.dataTransfer.files[0]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  return (
    <GrowerDashboardLayout>
      <div className="text-white">
        <h1 className="text-green-400 text-2xl font-bold mb-6">
          Upload CSV Inventory
        </h1>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-green-400/40 rounded-xl p-12 text-center cursor-pointer hover:bg-black/40 transition"
        >
          {file ? (
            <div>
              <p className="text-green-300">File Selected:</p>
              <p className="mt-2">{file.name}</p>
            </div>
          ) : (
            <p className="opacity-70">Drag & Drop CSV Here</p>
          )}
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="mt-4"
        />

        <button className="mt-6 bg-green-500/40 px-6 py-3 rounded-lg border border-green-400 hover:bg-green-500/60 transition">
          Process CSV
        </button>
      </div>
    </GrowerDashboardLayout>
  );
}
