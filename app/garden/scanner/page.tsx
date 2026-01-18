"use client";

import { useState } from "react";
import { MOCK_SCANNER_RESULT } from "@/lib/scanner/mockResult";
import type { ScannerResult } from "@/lib/scanner/types";

/**
 * IMPORTANT:
 * This page must ONLY consume ScannerResult from lib/scanner/types.ts
 * Do not add fields here unless the contract is updated first.
 */

const revealBase =
  "transition-all duration-500 ease-out";
const revealIn =
  "opacity-100 translate-y-0";
const revealOut =
  "opacity-0 translate-y-3";

export default function ScannerPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
  }

  function runScan() {
    // TEMP: mock pipeline
    setResult(MOCK_SCANNER_RESULT);
  }

  return (
    <section className="relative z-20 mx-auto w-full max-w-5xl px-4 py-8">
      <div className="rounded-3xl border border-white/20 bg-black/70 backdrop-blur-xl p-6 text-white">
        {/* SCANNER CONTENT GOES BELOW */}
        <h1 className="text-3xl font-bold mb-4">Scanner</h1>

      {/* Image Preview */}
      {imageUrl && (
        <div className="w-full flex justify-center my-4">
          <img
            src={imageUrl}
            alt="Scan preview"
            className="max-h-[220px] max-w-[220px] rounded-xl object-contain border border-white/20"
          />
        </div>
      )}

      {/* Controls */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm mb-4"
      />

      <button
        onClick={runScan}
        className="mb-4 w-full rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:bg-white/90"
      >
        Run Scan
      </button>

      {/* SCAN RESULT */}
      {result && (
        <div className="mt-6 space-y-4 text-white">

          <div className="border-b border-white/20 pb-2">
            <h2 className="text-2xl font-bold">{result.strainName}</h2>
            <p className="text-sm text-white/70">
              Confidence: {result.confidence}%
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/80">
              GENETICS
            </h3>
            <p className="text-sm">
              {result.genetics.dominance}
            </p>
            <p className="text-sm text-white/70">
              {result.genetics.lineage.join(" × ")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/80">
              EXPERIENCE
            </h3>
            <p className="text-sm">
              Effects: {result.experience.effects.join(", ")}
            </p>
            <p className="text-sm text-white/70">
              Best for: {result.experience.bestFor.join(", ")}
            </p>
            {result.experience.bestTime && (
              <p className="text-sm text-white/70">
                Best time: {result.experience.bestTime}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-white/20">
            <p className="text-xs text-white/50">
              {result.disclaimer}
            </p>
          </div>

        </div>
      )}
      </div>
    </section>
  );
}
