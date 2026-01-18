// app/garden/scanner/page.tsx
"use client";

import { useState } from "react";
import type { ScannerResult } from "@/lib/scanner/types";
import { buildScannerInsights } from "@/lib/scanner/insights";

export default function ScannerPage() {
  const [result, setResult] = useState<ScannerResult | null>(null);

  // MOCK — replace later with real scan pipeline
  const handleMockScan = () => {
    setResult({
      strainName: "Northern Lights",
      confidence: 0.81,
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

        <button
          onClick={handleMockScan}
          className="mb-8 rounded-xl bg-green-500/20 border border-green-400/40 px-6 py-3 font-semibold backdrop-blur-lg hover:bg-green-500/30 transition"
        >
          Run Scan
        </button>

        {insights.length > 0 && (
          <div className="space-y-6">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6"
              >
                <h2 className="text-xl font-bold mb-2">
                  {insight.headline}
                </h2>
                <p className="text-white/80">{insight.explanation}</p>
                {insight.confidenceNote && (
                  <p className="mt-2 text-sm text-white/60">
                    {insight.confidenceNote}
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
