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
    <section className="w-full max-w-5xl mx-auto px-4 py-8 text-white">
      <h1 className="text-3xl font-bold mb-4">Scanner</h1>

      {/* Image Preview */}
      {imageUrl && (
        <div className="relative w-full max-h-[35vh] overflow-hidden rounded-xl border border-white/20 mb-4">
          <Image
            src={imageUrl}
            alt="Scan preview"
            fill
            className="object-contain"
            priority
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />

        <button
          onClick={runScan}
          disabled={!imageUrl}
          className="rounded-xl bg-green-600 px-6 py-2 font-semibold disabled:opacity-40"
        >
          Run Scan
        </button>
      </div>

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
    </section>
  );
}
