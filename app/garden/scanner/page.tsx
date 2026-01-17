"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<boolean>(false);

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center px-6 py-16">
      
      {/* HEADER */}
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-4xl font-semibold mb-2">Scanner</h1>
        <p className="text-white/60 text-sm">
          Upload a photo to simulate a strain identification scan
        </p>
      </div>

      {/* SCANNER CARD */}
      <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 flex flex-col items-center gap-6">
        
        {/* IMAGE PREVIEW */}
        <div className="w-full aspect-square rounded-2xl bg-black/40 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Scan preview"
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-white/40 text-sm">No image selected</span>
          )}
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-3 w-full">
          <label className="w-full">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageUrl(URL.createObjectURL(file));
                  setResult(false);
                }
              }}
            />
            <div className="w-full cursor-pointer text-center rounded-xl bg-white/15 hover:bg-white/25 transition px-4 py-3 text-sm">
              Choose Photo
            </div>
          </label>

          <button
            onClick={() => setResult(true)}
            className="w-full rounded-xl bg-green-500/90 hover:bg-green-500 transition text-black font-medium py-3"
          >
            Run Scan
          </button>
        </div>
      </div>

      {/* RESULT CARD */}
      {result && (
        <div className="mt-10 w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Scan Result</h2>

          <ul className="space-y-2 text-white/80 text-sm">
            <li><strong>Type:</strong> Indica-leaning</li>
            <li><strong>Confidence:</strong> 81%</li>
            <li><strong>Aroma:</strong> Earthy + sweet</li>
            <li><strong>Effect:</strong> Relaxing body feel</li>
            <li><strong>Best for:</strong> Evening</li>
          </ul>
        </div>
      )}

      {/* FOOTNOTE */}
      <p className="mt-12 text-xs text-white/40 text-center max-w-md">
        Usage resets monthly (no rollovers). Authentication and subscription
        enforcement will be added later.
      </p>
    </main>
  );
}
