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

      {/* Results */}
      {result && (
        <div className="rounded-2xl bg-black/60 backdrop-blur border border-white/20 p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{result.strainName}</h2>
            <p className="text-white/70">
              Confidence: {result.confidence}%
            </p>
          </div>

          <div>
            <strong>Genetics:</strong> {result.genetics.dominance}
          </div>

          {result.highlights.aroma && (
            <div>
              <strong>Aroma:</strong> {result.highlights.aroma.join(", ")}
            </div>
          )}

          {result.highlights.effects && (
            <div>
              <strong>Effects:</strong> {result.highlights.effects.join(", ")}
            </div>
          )}

          {result.highlights.bestFor && (
            <div>
              <strong>Best for:</strong>{" "}
              {result.highlights.bestFor.join(", ")}
            </div>
          )}

          {result.highlights.bestTime && (
            <div>
              <strong>Best time:</strong> {result.highlights.bestTime}
            </div>
          )}

          <p className="text-xs text-white/50 mt-4">
            {result.disclaimer}
          </p>
        </div>
      )}
      </div>
    </section>
  );
}
