"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      // simulated scan result
      setResult({
        type: "Indica-leaning",
        confidence: "81%",
        aroma: "Earthy + sweet",
        effect: "Relaxing body feel",
        recommendation: "Best for evening",
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-10">
      {/* HEADER */}
      <h1 className="text-4xl font-extrabold mb-2">Scanner</h1>
      <p className="text-white/60 mb-8 text-center max-w-md">
        Upload a photo to simulate a strain identification scan.
      </p>

      {/* UPLOAD */}
      <label className="mb-8 inline-flex cursor-pointer rounded-xl bg-white/10 px-6 py-3 backdrop-blur-md border border-white/20 hover:bg-white/20 transition">
        <span className="text-sm font-medium">Choose Photo</span>
        <input type="file" accept="image/*" onChange={handleFile} hidden />
      </label>

      {/* PREVIEW */}
      {image && (
        <div className="w-full max-w-md mb-10 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
          <img
            src={image}
            alt="Preview"
            className="w-full h-auto object-contain"
          />
        </div>
      )}

      {/* RESULT */}
      {result && (
        <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-xl space-y-3">
          <h2 className="text-xl font-bold mb-2">Scan Result</h2>
          <p><strong>Type:</strong> {result.type}</p>
          <p><strong>Confidence:</strong> {result.confidence}</p>
          <p><strong>Aroma:</strong> {result.aroma}</p>
          <p><strong>Effect:</strong> {result.effect}</p>
          <p><strong>Recommendation:</strong> {result.recommendation}</p>
        </div>
      )}

      {/* FOOTER NOTE */}
      <p className="text-xs text-white/40 mt-10 text-center max-w-md">
        Usage resets monthly (no rollovers). Auth + Supabase wiring comes later.
      </p>
    </main>
  );
}
