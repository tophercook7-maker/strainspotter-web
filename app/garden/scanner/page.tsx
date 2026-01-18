"use client";

import { useState } from "react";

export default function ScannerPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [hasResult, setHasResult] = useState(false);

  function runScan() {
    if (!preview) return;

    setResult({
      strainName: "Northern Lights",
      confidence: 0.81,
      closestCultivarMatch: {
        name: "Northern Lights",
        confidence: 0.81,
      },
      inferredGenetics: {
        dominance: "Indica",
        parents: ["Afghani", "Thai"],
      },
      userFacingHighlights: {
        aromaProfile: ["Earthy", "Sweet"],
        effects: ["Relaxing", "Body-heavy"],
        bestFor: ["Evening use", "Stress relief"],
      },
    });
    setHasResult(true);
  }

  return (
    <section className="w-full min-h-screen flex flex-col items-center gap-6 px-6 py-10 text-white">
      <h1 className="text-3xl font-bold">Scanner</h1>

      {/* Controls */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const url = URL.createObjectURL(file);
          setPreview(url);
          setResult(null);
          setHasResult(false);
        }}
        className="block w-full text-sm text-white
          file:mr-4 file:rounded-full
          file:border-0
          file:bg-green-600/20
          file:px-4 file:py-2
          file:text-white
          hover:file:bg-green-600/30"
      />

      {preview && (
        <div className="mt-6 w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-white/20 bg-black/30">
          <img
            src={preview}
            alt="Scan preview"
            className="w-full h-[320px] object-cover"
          />
        </div>
      )}

      <button
        onClick={runScan}
        disabled={!preview}
        className="mt-6 w-full max-w-xl mx-auto rounded-full
          bg-green-600/30 hover:bg-green-600/40
          disabled:opacity-40 disabled:cursor-not-allowed
          px-6 py-3 text-white font-semibold"
      >
        Run Scan
      </button>

      {/* Result */}
      {result && hasResult && (
        <div className="w-full max-w-md mt-6 rounded-xl bg-white/10 border border-white/20 p-4">
          <h2 className="text-xl font-semibold">{result.strainName}</h2>
          <p className="text-sm text-white/70">
            Confidence: {Math.round(result.confidence * 100)}%
          </p>
          <ul className="mt-3 text-sm space-y-1">
            <li>Dominance: {result.inferredGenetics?.dominance}</li>
            {result.userFacingHighlights?.aromaProfile && (
              <li>
                Aroma: {result.userFacingHighlights.aromaProfile.join(", ")}
              </li>
            )}
            {result.userFacingHighlights?.effects && (
              <li>
                Effects: {result.userFacingHighlights.effects.join(", ")}
              </li>
            )}
            {result.userFacingHighlights?.bestFor && (
              <li>
                Best for: {result.userFacingHighlights.bestFor.join(", ")}
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
