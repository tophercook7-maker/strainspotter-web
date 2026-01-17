"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    type: string;
    confidence: number;
    notes: string[];
  }>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setImage(url);
    setResult(null);
  };

  const runScan = () => {
    setResult({
      type: "Indica-leaning",
      confidence: 81,
      notes: [
        "Earthy + sweet aroma",
        "Relaxing body feel",
        "Best for evening",
      ],
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-xl px-4 pt-10 space-y-6">
        {/* IMAGE PREVIEW — CLAMPED */}
        <div className="h-64 w-full rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt="Scan preview"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <label className="cursor-pointer text-white/60 text-sm">
              Tap to upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files && handleFile(e.target.files[0])
                }
              />
            </label>
          )}
        </div>

        {/* ACTION */}
        <button
          onClick={runScan}
          disabled={!image}
          className="w-full py-3 rounded-xl bg-green-500 text-black font-semibold disabled:opacity-40"
        >
          Scan
        </button>

        {/* RESULTS — FIXED BOX */}
        <div className="h-56 w-full rounded-xl bg-white/5 border border-white/10 p-4 overflow-y-auto">
          {result ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold text-green-400">
                {result.type}
              </div>
              <div className="text-sm text-white/70">
                Confidence: {result.confidence}%
              </div>
              <ul className="list-disc list-inside text-sm text-white/80">
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-white/40 text-sm">
              Scan results will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
