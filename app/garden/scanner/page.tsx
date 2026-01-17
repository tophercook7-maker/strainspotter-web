"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    type: string;
    confidence: number;
    aroma: string;
    effect: string;
    recommendation: string;
  }>(null);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const runScan = () => {
    setResult({
      type: "Indica-leaning",
      confidence: 81,
      aroma: "Earthy + sweet",
      effect: "Relaxing body feel",
      recommendation: "Best for evening",
    });
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 space-y-8">
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Scanner</h1>
          <p className="text-white/60 text-sm">
            Upload a photo to simulate a strain identification scan
          </p>
        </div>

        {/* IMAGE PREVIEW */}
        <div className="flex justify-center">
          <div className="w-56 h-56 rounded-2xl overflow-hidden bg-black/40 border border-white/20 flex items-center justify-center">
            {image ? (
              <Image
                src={image}
                alt="Scan preview"
                width={224}
                height={224}
                className="object-cover"
              />
            ) : (
              <span className="text-white/40 text-sm">No image</span>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-center">
          <label className="cursor-pointer px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition text-sm">
            Choose Photo
            <input type="file" accept="image/*" hidden onChange={handleUpload} />
          </label>

          <button
            onClick={runScan}
            className="px-4 py-2 rounded-xl bg-green-500/80 hover:bg-green-500 transition text-sm text-black font-medium"
          >
            Run Scan
          </button>
        </div>

        {/* RESULT */}
        {result && (
          <div className="rounded-2xl bg-black/40 border border-white/15 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Result</h2>
              <span className="text-green-400 text-sm font-medium">
                {result.confidence}% confident
              </span>
            </div>

            <ul className="text-sm space-y-1 text-white/80">
              <li><strong>Type:</strong> {result.type}</li>
              <li><strong>Aroma:</strong> {result.aroma}</li>
              <li><strong>Effect:</strong> {result.effect}</li>
              <li><strong>Best for:</strong> {result.recommendation}</li>
            </ul>
          </div>
        )}

        {/* FOOTNOTE */}
        <p className="text-center text-xs text-white/40">
          Usage resets monthly. Authentication and subscriptions will be enforced later.
        </p>
      </div>
    </main>
  );
}
