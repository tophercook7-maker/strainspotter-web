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
          {/* IDENTITY */}
          <div className="mb-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {result.strainName}
            </h1>
            <p className="text-white/70 mt-1">
              Confidence: <span className="font-semibold text-white">{result.confidence}%</span>
            </p>
          </div>

          {/* CORE MEANING */}
          <div className="grid grid-cols-2 gap-4 text-sm md:text-base mb-4">
            <div>
              <p className="font-semibold">Dominance</p>
              <p className="text-white/80">{result.genetics.dominance}</p>
            </div>
            {result.highlights.bestTime && (
              <div>
                <p className="font-semibold">Best Time</p>
                <p className="text-white/80">{result.highlights.bestTime}</p>
              </div>
            )}
            {result.highlights.effects && (
              <div>
                <p className="font-semibold">Effects</p>
                <p className="text-white/80">
                  {result.highlights.effects.join(", ")}
                </p>
              </div>
            )}
            {result.highlights.aroma && (
              <div>
                <p className="font-semibold">Aroma</p>
                <p className="text-white/80">
                  {result.highlights.aroma.join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* DEPTH */}
          <div className="text-xs text-white/60 border-t border-white/20 pt-3">
            <p>
              Results are AI-assisted estimates based on visual analysis and known cultivar data.
              Not a definitive identification.
            </p>
          </div>
        </section>
      )}
      </div>
    </section>
  );
}
