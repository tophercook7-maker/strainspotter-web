// app/garden/scanner/page.tsx
"use client";

import { useState, useEffect } from "react";
import type { ScannerResult } from "@/lib/scanner/types";
import { buildScannerInsights } from "@/lib/scanner/insights";

export default function ScannerPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerResult | null>(null);

  // Cleanup object URL on unmount or previewUrl change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // MOCK — replace later with real scan pipeline
  const mockResult: ScannerResult = {
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
  };

  const insights = result ? buildScannerInsights(result) : [];

  return (
    <div className="min-h-screen w-full px-6 py-10 text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Scanner</h1>

        <label className="cursor-pointer rounded-xl bg-white/10 border border-white/20 px-6 py-3 font-semibold backdrop-blur-lg hover:bg-white/15 transition text-center block mb-8">
          Choose Photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] ?? null;
              if (selectedFile) {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
              } else {
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl(null);
              }
              setResult(null);
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setResult(mockResult);
          }}
          className="mt-6 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 transition text-white font-semibold"
        >
          Scan
        </button>

        {previewUrl && (
          <div className="w-full flex justify-center mt-6">
            <div className="w-44 h-44 rounded-xl overflow-hidden border border-white/20 bg-white/5">
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
