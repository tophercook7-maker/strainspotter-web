"use client";

import { useState } from "react";
import Image from "next/image";
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
        <div className="relative mb-4 h-[280px] w-full overflow-hidden rounded-2xl border border-white/30 bg-black">
          <Image
            src={imageUrl}
            alt="Uploaded cannabis sample"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
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
            <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6">
              <h2 className="text-3xl font-semibold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  {result.strainName}
                </span>
              </h2>
              <p className="mt-1 text-white/70">
                Confidence: <span className="font-medium text-white">{result.confidence}%</span>
              </p>
            </div>

            {/* CORE INSIGHTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Genetics */}
              <div className="rounded-xl bg-white/5 border border-white/15 p-5 transition-all duration-500 delay-75 ease-out">
                <h3 className="text-sm uppercase tracking-wide text-white/60 mb-2">
                  Genetics
                </h3>
                <p className="text-lg">
                  {result.genetics.dominance}
                </p>
                {result.genetics.parents && (
                  <p className="mt-1 text-white/60 text-sm">
                    {result.genetics.parents.join(" × ")}
                  </p>
                )}
              </div>

              {/* Experience */}
              <div className="rounded-xl bg-white/5 border border-white/15 p-5 transition-all duration-500 delay-150 ease-out">
                <h3 className="text-sm uppercase tracking-wide text-white/60 mb-2">
                  Experience
                </h3>
                {result.highlights.effects && (
                  <p className="text-sm leading-relaxed text-white/80">
                    {result.highlights.effects.join(", ")}
                  </p>
                )}
                {result.highlights.bestFor && (
                  <p className="mt-2 text-white/60 text-sm">
                    Best for: {result.highlights.bestFor.join(", ")}
                  </p>
                )}
              </div>

            </div>

            {/* DEPTH / DISCLAIMER */}
            <div className="border-t border-white/15 pt-3 text-xs text-white/60">
              Results are AI-assisted estimates. Not a substitute for lab testing.
            </div>

          </div>
        </section>
      )}
      </div>
    </section>
  );
}
