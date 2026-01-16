"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
  };

  const runScan = () => {
    setScanResult({
      type: "Indica-leaning",
      confidence: 81,
      aroma: "Earthy + sweet",
      effect: "Relaxing body feel",
      recommendation: "Best for evening",
    });
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="text-3xl font-semibold text-center mb-2">Scanner</h1>
      <p className="text-center text-white/60 mb-8">
        Upload a photo to simulate an identification scan
      </p>

      {/* Upload */}
      <div className="flex justify-center mb-8">
        <input type="file" onChange={handleFile} />
      </div>

      {/* Preview */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              className="w-full max-h-[420px] object-contain mx-auto"
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/40">
              No image selected
            </div>
          )}
        </div>
      </div>

      {/* Run Scan */}
      <div className="flex justify-center mt-8">
        <button
          onClick={runScan}
          className="px-8 py-3 rounded-full bg-white text-black font-medium shadow-lg hover:bg-white/90 transition"
        >
          Run Scan
        </button>
      </div>

      {/* Results */}
      {scanResult && (
        <div className="mt-10 max-w-2xl mx-auto rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Scan Result</h3>
          <ul className="space-y-2 text-white/80 text-sm">
            <li>
              <b>Type:</b> {scanResult.type}
            </li>
            <li>
              <b>Confidence:</b> {scanResult.confidence}%
            </li>
            <li>
              <b>Aroma:</b> {scanResult.aroma}
            </li>
            <li>
              <b>Effect:</b> {scanResult.effect}
            </li>
            <li className="text-white/60 pt-2">
              Recommendation: {scanResult.recommendation}
            </li>
          </ul>
        </div>
      )}
    </main>
  );
}
