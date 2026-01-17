"use client";

import { useState, type ChangeEvent } from "react";

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setResult(null);
  };

  const runScan = () => {
    // mock result (safe + deterministic)
    setResult({
      type: "Indica-leaning",
      confidence: "81%",
      aroma: "Earthy + sweet",
      effect: "Relaxing body feel",
      recommendation: "Best for evening",
    });
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 space-y-6">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Scanner</h1>
          <p className="text-white/70 text-sm">
            Upload a photo to simulate a strain identification scan
          </p>
        </div>

        {/* IMAGE PREVIEW */}
        <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt="Scan preview"
              className="max-h-[260px] w-auto object-contain"
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
              No image selected
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-center">
          <label className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 transition cursor-pointer text-sm">
            Choose Photo
            <input type="file" accept="image/*" onChange={handleUpload} hidden />
          </label>

          <button
            onClick={runScan}
            disabled={!image}
            className="px-4 py-2 rounded-full bg-green-500/80 hover:bg-green-500 disabled:opacity-40 transition text-sm"
          >
            Run Scan
          </button>
        </div>

        {/* RESULT */}
        {result && (
          <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-2 text-sm">
            <div className="font-semibold text-white">Scan Result</div>
            <div className="text-white/80">Type: {result.type}</div>
            <div className="text-white/80">Confidence: {result.confidence}</div>
            <div className="text-white/80">Aroma: {result.aroma}</div>
            <div className="text-white/80">Effect: {result.effect}</div>
            <div className="text-white/80">
              Recommendation: {result.recommendation}
            </div>
          </div>
        )}

        {/* FOOTNOTE */}
        <p className="text-[11px] text-white/40 text-center">
          Usage resets monthly. Authentication and subscriptions will be enforced later.
        </p>
      </div>
    </main>
  );
}
