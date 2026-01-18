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
            className="
              max-h-64
              max-w-full
              object-contain
              rounded-xl
              border
              border-white/20
            "
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
        <section className="mt-6 max-w-2xl mx-auto rounded-3xl bg-black/70 backdrop-blur-xl border border-white/20 p-6 text-white shadow-2xl">
          {/* content injected below */}
          {/* RESULT SURFACE */}
          <div
            className={`mt-6 space-y-6 ${revealBase} ${
              result ? revealIn : revealOut
            }`}
          >

            {/* PRIMARY ANCHOR */}
            <div className="mt-6">
              <h1 className="text-3xl font-bold tracking-tight">
                {result.strainName}
              </h1>
              <p className="text-sm text-white/70 mt-1">
                Confidence: {result.confidence}%
              </p>
            </div>

            {/* CORE INSIGHTS */}
            <div className="mt-6 grid gap-4">

              <div className="rounded-xl bg-white/10 p-4">
                <h3 className="text-xs uppercase tracking-wide text-white/60">
                  Genetics
                </h3>
                <p className="mt-1">
                  {result.genetics.dominance}
                </p>
                {result.genetics.parents && (
                  <p className="text-sm text-white/70">
                    {result.genetics.parents.join(" × ")}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <h3 className="text-xs uppercase tracking-wide text-white/60">
                  Experience
                </h3>
                {result.highlights.effects && (
                  <p>{result.highlights.effects.join(", ")}</p>
                )}
                {result.highlights.bestFor && (
                  <p className="text-sm text-white/70">
                    Best for: {result.highlights.bestFor.join(", ")}
                  </p>
                )}
              </div>

            </div>

            {/* DEPTH / DISCLAIMER */}
            <p className="mt-6 text-xs text-white/50">
              Results are AI-assisted estimates and not a substitute for lab testing.
            </p>

          </div>
        </section>
      )}
      </div>
    </section>
  );
}
