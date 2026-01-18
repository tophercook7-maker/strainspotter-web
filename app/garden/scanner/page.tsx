// app/garden/scanner/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import type { ScannerResult } from "@/lib/scanner/types";
import { buildScannerInsights } from "@/lib/scanner/insights";

export default function ScannerPage() {
  const [result, setResult] = useState<ScannerResult | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // Cleanup object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // MOCK — replace later with real scan pipeline
  const handleMockScan = () => {
    setResult({
      strainName: "Northern Lights",
      confidence: 81,
      closestCultivarMatch: {
        name: "Northern Lights",
        similarity: 81,
      },
      inferredGenetics: {
        dominance: "Indica",
      },
      userFacingHighlights: {
        aromaProfile: ["Earthy", "Sweet"],
        effects: ["Relaxing", "Body-heavy"],
        bestFor: ["Evening use", "Stress relief"],
      },
    });
  };

  const insights = result ? buildScannerInsights(result) : [];

  return (
    <div className="min-h-screen w-full px-6 py-10 text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Scanner</h1>

        <div className="mb-8 flex flex-col gap-4">
          <label className="cursor-pointer rounded-xl bg-white/10 border border-white/20 px-6 py-3 font-semibold backdrop-blur-lg hover:bg-white/15 transition text-center">
            Choose Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] ?? null;
                setFile(selectedFile);
                setResult(null);
              }}
            />
          </label>

          <button
            onClick={handleMockScan}
            disabled={!file}
            className="rounded-xl bg-green-500/20 border border-green-400/40 px-6 py-3 font-semibold backdrop-blur-lg hover:bg-green-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Scan
          </button>
        </div>

        {previewUrl && (
          <div className="w-full flex justify-center mt-6">
            <div className="w-48 h-48 rounded-xl overflow-hidden border border-white/20 bg-white/5">
              <img
                src={previewUrl}
                alt="Scan preview"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 text-white shadow-lg"
              >
                <h3 className="text-lg font-semibold mb-2 text-green-300">
                  {insight.title}
                </h3>
                <p className="text-sm text-white/90 leading-relaxed">
                  {insight.description}
                </p>
                {typeof insight.confidence === "number" && (
                  <p className="mt-3 text-xs text-white/60">
                    Confidence: {insight.confidence}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
