// app/garden/scanner/page.tsx
"use client";

import { useState, useEffect } from "react";
import type { ScannerResult } from "@/lib/scanner/types";
import { buildScannerInsights } from "@/lib/scanner/insights";

export default function ScannerPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

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
    <>
      <div className="fixed top-4 left-4 z-[9999] bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
        SCANNER DEBUG — BUILD CHECK
      </div>
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

        {previewUrl && (
          <div className="w-full flex justify-center mt-6">
            <div className="w-40 h-40 rounded-xl overflow-hidden border border-white/20 bg-black/40">
              <img
                src={previewUrl}
                alt="Scan preview"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setResult({
              strainName: "Unknown Cultivar",
              confidence: 81,
              inferredGenetics: {
                dominance: "Indica",
                parents: ["Unknown", "Unknown"],
              },
              closestCultivarMatch: {
                name: "Analysis Unavailable",
                similarity: 0,
              },
              userFacingHighlights: {
                aromaProfile: ["Earthy", "Sweet"],
                effects: ["Relaxing", "Calming"],
                bestFor: ["Evening"],
              },
            });
          }}
          className="mt-6 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 transition text-white font-semibold"
        >
          Scan
        </button>

        {result && (
          <div className="mt-8 max-w-md mx-auto rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 p-6 text-white">
            <h2 className="text-xl font-bold mb-2">{result.strainName}</h2>
            <p className="text-sm opacity-80 mb-4">
              Confidence: {result.confidence}%
            </p>

            {result.userFacingHighlights?.aromaProfile && (
              <p><strong>Aroma:</strong> {result.userFacingHighlights.aromaProfile.join(", ")}</p>
            )}
            {result.userFacingHighlights?.effects && (
              <p><strong>Effects:</strong> {result.userFacingHighlights.effects.join(", ")}</p>
            )}
            {result.userFacingHighlights?.bestFor && (
              <p><strong>Best for:</strong> {result.userFacingHighlights.bestFor.join(", ")}</p>
            )}
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
    </>
  );
}
