"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState(false);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 text-white">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold mb-2">Scanner</h1>
          <p className="text-white/60 text-sm">
            Upload a photo to simulate a strain identification scan
          </p>
        </div>

        {/* Image Preview */}
        <div className="flex justify-center mb-6">
          {image ? (
            <img
              src={image}
              alt="Preview"
              className="max-h-64 rounded-xl object-contain border border-white/10"
            />
          ) : (
            <div className="h-48 w-48 flex items-center justify-center rounded-xl border border-dashed border-white/20 text-white/40">
              No image
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3 mb-6">
          <label className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer transition">
            Choose Photo
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImage(URL.createObjectURL(file));
                  setResult(false);
                }
              }}
            />
          </label>

          <button
            onClick={() => setResult(true)}
            disabled={!image}
            className="px-4 py-2 rounded-lg bg-green-500 text-black font-medium disabled:opacity-40 transition"
          >
            Run Scan
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6 rounded-xl bg-black/40 border border-white/10 p-4">
            <h2 className="font-semibold mb-2">Scan Result</h2>
            <ul className="text-sm text-white/80 space-y-1">
              <li><strong>Type:</strong> Indica-leaning</li>
              <li><strong>Confidence:</strong> 81%</li>
              <li><strong>Aroma:</strong> Earthy + sweet</li>
              <li><strong>Effect:</strong> Relaxing body feel</li>
              <li><strong>Best for:</strong> Evening</li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-xs text-white/40 text-center">
          Usage resets monthly. Authentication and subscriptions will be enforced later.
        </p>
      </div>
    </main>
  );
}
